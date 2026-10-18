import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { z } from 'zod';
import {
	Client,
	Events,
	GatewayIntentBits,
	type Guild,
	type GuildMember,
	type Role,
} from 'discord.js';
import { Redis } from 'ioredis';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import type { ServerMessage } from '@osu-idle/shared/community/wire';

// One .env for the whole backend: the bot reads the server's.
config({ path: fileURLToPath(new URL('../../server/.env', import.meta.url)) });

const env = z.object({
	NODE_ENV: z.enum(['development', 'production']).default('development'),
	DISCORD_BOT_TOKEN: z.string().min(1),
	DISCORD_GUILD_ID: z.string().min(1).default('1511463564135759954'),
	DB_HOST: z.string().min(1),
	DB_PORT: z.coerce.number().int().positive().default(3306),
	DB_USER: z.string().min(1),
	DB_PASSWORD: z.string(),
	DB_NAME: z.string().min(1).default('idle'),
	DB_NAME_DEV: z.string().min(1).default('idle_test'),
	REDIS_HOST: z.string().min(1).default('127.0.0.1'),
	REDIS_PORT: z.coerce.number().int().positive().default(6379),
	REDIS_PASSWORD: z.string().optional(),
	REDIS_DB: z.coerce.number().int().min(0).default(0),
}).parse(process.env);

const isProd = env.NODE_ENV === 'production';

/** The site's level colours, `.level_100` .. `.level_110` in shared.css. */
const RAMP = new Map([...readFileSync(
	fileURLToPath(new URL('../../shared/src/shared.css', import.meta.url)),
	'utf8',
).matchAll(/\.level_(\d+) \{\s*color: rgb\((\d+), (\d+), (\d+)\)/g)]
	.map(([, level, ...rgb]) => [Number(level), rgb.map(Number)]));
const RAMP_MIN = Math.min(...RAMP.keys());
const RAMP_MAX = Math.max(...RAMP.keys());
// Discord's default role colour.
const GRAY = [0x99, 0xaa, 0xb5];

/** Every 10 levels, then every level once on the site's colour ramp. */
const tierOf = (level: number) => {
	if (level >= RAMP_MIN) return level;
	if (level >= 10) return Math.floor(level / 10) * 10;
};
const roleName = (tier: number) => (tier >= RAMP_MIN ? `Level ${tier}` : `Level ${tier}+`);
const tierOfRole = (role: Role) => Number(/^Level (\d+)\+?$/.exec(role.name)?.[1]) || undefined;

/** Under the ramp: from Discord gray up to the ramp's first colour. */
const colourOf = (tier: number) => {
	const top = RAMP.get(RAMP_MIN)!;
	const rgb = tier >= RAMP_MIN
		? RAMP.get(Math.min(tier, RAMP_MAX))!
		: GRAY.map((from, i) => Math.round(from + (top[i] - from) * tier / RAMP_MIN));
	return (rgb[0] << 16) + (rgb[1] << 8) + rgb[2];
};

const FULL_SYNC_MS = 15 * 60 * 1000;

const db = mysql.createPool({
	host: env.DB_HOST,
	port: env.DB_PORT,
	user: env.DB_USER,
	password: env.DB_PASSWORD,
	database: isProd ? env.DB_NAME : env.DB_NAME_DEV,
	connectionLimit: 2,
});

/** Discord id → overall level of the account's current character, for linked accounts. */
const linkedLevels = async (filter = '', args: unknown[] = []) => {
	const [rows] = await db.query<RowDataPacket[]>(
		`SELECT u.discord_id AS discordId, c.overall_level AS level
		FROM user u JOIN \`character\` c ON c.id = u.current_character
		WHERE u.discord_id IS NOT NULL AND u.restricted_at IS NULL ${filter}`,
		args,
	);
	return new Map(rows.map(row => [row.discordId as string, row.level as number]));
};

/** Keep the level roles together, highest on top, so the member list reads as a ladder. */
const orderRoles = async (guild: Guild) => {
	const ladder = [...guild.roles.cache.values()]
		.filter(role => tierOfRole(role) !== undefined)
		.sort((a, b) => tierOfRole(a)! - tierOfRole(b)!);
	const base = Math.min(...ladder.map(role => role.position));
	await guild.roles.setPositions(ladder.map((role, i) => ({
		role, position: base + i, 
	})));
};

const creating = new Map<number, Promise<Role>>();

/** A role is made the first time someone reaches it. */
const roleFor = (guild: Guild, tier: number): Promise<Role> => {
	const existing = guild.roles.cache.find(role => role.name === roleName(tier));
	if (existing) return Promise.resolve(existing);
	let made = creating.get(tier);
	if (!made) {
		made = guild.roles.create({
			name: roleName(tier), colors: { primaryColor: colourOf(tier) }, hoist: true,
		}).then(async role => {
			await orderRoles(guild);
			return role;
		}).finally(() => creating.delete(tier));
		creating.set(tier, made);
	}
	return made;
};

/** A level role nobody holds any more goes: the ladder only shows levels players are at. */
const dropEmpty = async (roles: Role[]) => {
	for (const role of roles) {
		if (tierOfRole(role) !== undefined && role.members.size === 0) await role.delete();
	}
};

const syncMember = async (member: GuildMember, level: number | undefined) => {
	if (member.user.bot) return;
	const tier = level === undefined ? undefined : tierOf(level);
	const want = tier === undefined ? undefined : await roleFor(member.guild, tier);
	const stale = member.roles.cache.filter(role => role !== want && tierOfRole(role) !== undefined);
	if (want && !member.roles.cache.has(want.id)) await member.roles.add(want);
	if (stale.size) {
		await member.roles.remove(stale);
		await dropEmpty([...stale.values()]);
	}
};

const syncLinked = async (guild: Guild, levels: Map<string, number>) => {
	for (const [discordId, level] of levels) {
		const member = await guild.members.fetch(discordId).catch(() => undefined);
		if (member) await syncMember(member, level);
	}
};

/** Every member: also takes the role back from an account that was unlinked or relinked. */
const syncAll = async (guild: Guild) => {
	const levels = await linkedLevels();
	const members = await guild.members.fetch();
	for (const member of members.values()) await syncMember(member, levels.get(member.id));
	await dropEmpty([...guild.roles.cache.values()]);
};

/** The server pushes the character over its socket hub after every change - a
 *  play's xp, a rebirth, a fresh link - so listening there keeps roles live. */
const followCharacters = (guild: Guild) => {
	const sub = new Redis({
		host: env.REDIS_HOST,
		port: env.REDIS_PORT,
		password: env.REDIS_PASSWORD,
		db: env.REDIS_DB,
	});
	sub.on('error', err => console.error('[discord] redis:', err.message));
	void sub.subscribe(`${isProd ? 'osu-idle:prod:' : 'osu-idle:dev:'}ws:broadcast`);
	sub.on('message', (_channel, payload) => {
		const { msg } = JSON.parse(payload) as { msg?: ServerMessage };
		if (msg?.type !== 'character') return;
		void linkedLevels('AND u.id = ?', [msg.character.userId])
			.then(levels => syncLinked(guild, levels))
			.catch(err => console.error('[discord] character sync:', err));
	});
};

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once(Events.ClientReady, async ready => {
	const guild = await ready.guilds.fetch(env.DISCORD_GUILD_ID);
	await guild.roles.fetch();
	followCharacters(guild);
	const fullSync = () => syncAll(guild).catch(err => console.error('[discord] full sync:', err));
	await fullSync();
	setInterval(fullSync, FULL_SYNC_MS);
	console.log(`[discord] ${ready.user.tag} managing level roles on ${guild.name}`);
});

client.on(Events.GuildMemberAdd, member => {
	if (member.guild.id !== env.DISCORD_GUILD_ID) return;
	void linkedLevels('AND u.discord_id = ?', [member.id])
		.then(levels => syncMember(member, levels.get(member.id)))
		.catch(err => console.error('[discord] member join:', err));
});

await client.login(env.DISCORD_BOT_TOKEN);
