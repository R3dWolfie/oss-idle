/**
 * The move to the oss!idle names, for the one deploy that switches them:
 *
 *   OSS_RENAME=1 npm run deploy:prod:migrate
 *
 * The deploy scripts call it before the API restarts; without OSS_RENAME it does
 * nothing. By hand, from the repo root:
 *
 *   OSS_RENAME=1 node scripts/migrate-oss-rename.mjs prod   the units, then the prod Redis keys
 *   OSS_RENAME=1 node scripts/migrate-oss-rename.mjs dev    the staging Redis keys only
 *
 * prod: stops osu-idle-prod and osu-idle-discord, installs oss-idle-prod and
 * oss-idle-discord in their place (enabled, the bot started; the deploy starts the
 * API), and moves the API's pm2 home. Redis: every `osu-idle:<env>:` key becomes
 * `oss-idle:<env>:`, and the #osu!idle chat history becomes #oss!idle's.
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import {
	existsSync,
	renameSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

if (!process.env.OSS_RENAME) process.exit(0);

const require = createRequire(import.meta.url);
require('dotenv').config({ path: 'packages/server/.env' });

const { default: Redis } = await import('ioredis');

const env = process.argv[2];
if (env !== 'prod' && env !== 'dev') {
	console.error('usage: node scripts/migrate-oss-rename.mjs prod|dev');
	process.exit(1);
}

const sudo = (...args) => execFileSync('sudo', args, { stdio: 'inherit' });
const UNITS = '/etc/systemd/system';
const swapUnits = env === 'prod' && existsSync(`${UNITS}/osu-idle-prod.service`);

if (swapUnits) {
	sudo('systemctl', 'disable', '--now', 'osu-idle-prod', 'osu-idle-discord');
	sudo(
		'cp',
		'packages/server/deploy/oss-idle-prod.service',
		'packages/discord/deploy/oss-idle-discord.service',
		UNITS,
	);
	sudo('rm', `${UNITS}/osu-idle-prod.service`, `${UNITS}/osu-idle-discord.service`);
	sudo('systemctl', 'daemon-reload');
	sudo('systemctl', 'enable', 'oss-idle-prod', 'oss-idle-discord');
	const pm2 = join(homedir(), '.pm2-osu-idle-prod');
	const pm2New = join(homedir(), '.pm2-oss-idle-prod');
	if (existsSync(pm2) && !existsSync(pm2New)) renameSync(pm2, pm2New);
	console.log('units: osu-idle-* replaced by oss-idle-*');
}

// mirrors packages/server/src/env.ts and ws/chat.ts
const from = `osu-idle:${env}:`;
const to = `oss-idle:${env}:`;

const redis = new Redis({
	host: process.env.REDIS_HOST ?? '127.0.0.1',
	port: Number(process.env.REDIS_PORT ?? 6379),
	password: process.env.REDIS_PASSWORD || undefined,
	db: Number(process.env.REDIS_DB ?? 0),
});

let cursor = '0', moved = 0;
do {
	const [next, keys] = await redis.scan(cursor, 'MATCH', `${from}*`, 'COUNT', 1000);
	cursor = next;
	if (keys.length) {
		const batch = redis.pipeline();
		for (const key of keys) batch.rename(key, to + key.slice(from.length));
		await batch.exec();
		moved += keys.length;
	}
} while (cursor !== '0');
console.log(`redis: ${moved} keys moved from ${from} to ${to}`);

const log = `${to}chat:log:`;
const idx = `${to}chat:idx:`;
const lines = await redis.hgetall(`${log}#osu!idle`);
if (Object.keys(lines).length) {
	const tx = redis.multi().del(`${log}#osu!idle`);
	for (const [id, raw] of Object.entries(lines)) {
		tx.hset(`${log}#oss!idle`, id, JSON.stringify({
			...JSON.parse(raw), channel: '#oss!idle',
		}));
	}
	await tx.exec();
}
if (await redis.exists(`${idx}#osu!idle`)) await redis.rename(`${idx}#osu!idle`, `${idx}#oss!idle`);
console.log(`chat: ${Object.keys(lines).length} lines moved to #oss!idle`);

if (swapUnits) sudo('systemctl', 'start', 'oss-idle-discord');
await redis.quit();
