import type { ZodError } from 'zod';
import type { Hono } from 'hono';
import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import {
	createNodeWebSocket,
	type NodeWebSocket,
} from '@hono/node-ws';
import { clientMessage } from '@oss-idle/shared/community/wire';
import { VERSION } from '@oss-idle/shared/version';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import {
	characters,
	characterToDTO,
	type CharacterRow,
} from '../db/schema/character';
import {
	users,
	type UserRow,
} from '../db/schema/user';
import { SESSION_COOKIE } from '../auth/middleware';
import {
	clientUrl,
	isProd,
} from '../env';
import { verifySession } from '../auth/jwt';
import {
	clientIp,
	geoLookup,
	type GeoResult,
	validTimezone,
} from '../geo';
import type { WSContext } from 'hono/ws';
import { hub } from './hub';
import {
	areOnline,
	join,
	leave,
	presenceSnapshot,
	recordAdoption,
	touch,
	update,
} from './presence';
import {
	handleChat,
	nameColor,
} from './chat';
import {
	isPlaying,
	livePlayPresence,
	playState,
} from '../play';
import {
	handlePlay,
	PlayFeed,
} from './play';
import { touchActive } from '../social';
import { handlePm } from './pm';
import {
	handleMultiplayer,
	MatchFeed,
	ownMatch,
} from './multiplayer';

/** How often a live connection refreshes its presence last-seen (well under the
 *  sweep TTL) so a clean session is never pruned. */
const TOUCH_MS = 30 * 1000;

/** The session JWT for a WS upgrade: Bearer / cookie like REST, plus a `?token=`
 *  fallback because a browser can't set headers on a WebSocket and the desktop
 *  app has no cookie. */
const wsToken = (c: Context): string | undefined => {
	const auth = c.req.header('Authorization');
	if (auth?.startsWith('Bearer ')) return auth.slice('Bearer '.length).trim();
	// the cookie also rides along from sibling sites on the same domain
	const ownOrigin = !isProd || c.req.header('Origin') === clientUrl;
	const cookie = ownOrigin ? getCookie(c, SESSION_COOKIE) : undefined;
	return cookie ?? c.req.query('token');
};

const resolveCharacter = async (
	userId: number,
): Promise<{ character: CharacterRow; user: UserRow } | undefined> => {
	const [row] = await db
		.select()
		.from(characters)
		.innerJoin(users, eq(users.currentCharacter, characters.id))
		.where(eq(users.id, userId))
		.limit(1);
	return row ? {
		character: row.character, user: row.user,
	} : undefined;
};

/** Put a character on the roster. join() resets status to idle, so a live play
 *  is restored as `playing`. */
const enter = async (character: CharacterRow, user: UserRow, geo: GeoResult): Promise<void> => {
	await join({
		character, user, geo,
	});
	const live = await livePlayPresence(character.id);
	if (live) await update(character.id, live);
};

/** Refresh a connection's last-seen. The roster entry is per character, so
 *  another of its sockets closing - elsewhere in the cluster too - takes it away
 *  from this one; put it back. */
const heartbeat = async (characterId: number, userId: number, geo: GeoResult): Promise<void> => {
	void touchActive(userId);
	const [listed] = await areOnline([characterId]);
	if (listed) {
		await touch(characterId);
		return;
	}
	const now = await resolveCharacter(userId);
	if (now && !now.user.restrictedAt) await enter(now.character, now.user, geo);
};

/**
 * Mount the community WebSocket at `/v1/ws`. Returns `injectWebSocket`, which the
 * server entrypoint attaches to the Node http server. Not part of `AppType` - the
 * socket is a typed message bus (shared `clientMessage`/`serverMessage`), not RPC.
 */
/** A message that fails validation is dropped, and a dropped message is
 *  indistinguishable from one the client never sent: whatever it asked for
 *  simply never happens, with nothing anywhere to say why. */
const reportDiscarded = (userId: number, raw: unknown, error: ZodError): void => {
	console.error('[ws] discarded an invalid message from', userId,
		(raw as { type?: string })?.type ?? '(no type)',
		error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
};

export const registerWs = (app: Hono): Pick<NodeWebSocket, 'injectWebSocket'> => {
	const {
		upgradeWebSocket, injectWebSocket, wss,
	} = createNodeWebSocket({ app });
	// ws allows 100 MiB frames by default; no message of ours comes near 64 KiB
	wss.options.maxPayload = 64 * 1024;

	app.get('/v1/ws', upgradeWebSocket(async c => {
		const token = wsToken(c);
		const session = token ? await verifySession(token).catch(() => undefined) : undefined;
		const resolved = session ? await resolveCharacter(session.uid) : undefined;

		if (!session || !resolved) {
			return { onOpen: (_e, ws) => ws.close(1008, 'unauthorized') };
		}

		const { character, user } = resolved;
		const userId = session.uid;
		// the city DB has no timezones, so the client's own wins
		const geo = await geoLookup(clientIp(c), user.country);
		geo.tz = validTimezone(c.req.query('tz')) ?? geo.tz;
		let beat: ReturnType<typeof setInterval> | undefined;
		let feed: PlayFeed | undefined;
		let scores: MatchFeed | undefined;

		// The account's character can change under a live socket - a rebirth parked
		// during a play applies when it ends - and the hub is what knows where the
		// socket belongs now, so everything addressed by id reads that.
		const bound = (ws: WSContext) => hub.ownerOf(ws) ?? character.id;
		// Anything about the character itself - its name - is read when it is
		// needed. The row captured at connect stops being true the moment the
		// account rebirths or renames, and holding it against any one of those
		// signals only covers that one.
		const currentRow = async () =>
			(await resolveCharacter(userId))?.character ?? character;

		return {
			onOpen: async (_e, ws) => {
				hub.add(character.id, ws);
				feed = new PlayFeed(() => bound(ws), ws);
				scores = new MatchFeed(() => bound(ws), ws);
				// join() broadcasts our entry; the snapshot below already includes it.
				await enter(character, user, geo);
				hub.sendLocal(ws, {
					type: 'presence:init', entries: await presenceSnapshot(),
				});
				hub.sendLocal(ws, {
					type: 'version', version: VERSION,
				});
				// the character as the server has it, so a client that was away -
				// or one whose copy drifted - starts from the row, not from what it
				// last managed to read
				hub.sendLocal(ws, {
					type: 'character',
					character: characterToDTO(character, user.avatarUrl, user.country),
				});
				// what (if anything) the character is playing, for resume/spectate
				hub.sendLocal(ws, {
					type: 'play:state', state: await playState(character.id),
				});
				const match = await ownMatch(character.id);
				if (match) {
					hub.sendLocal(ws, {
						type: 'mp:joined', match,
					});
				}
				void touchActive(userId);
				beat = setInterval(() => void heartbeat(bound(ws), userId, geo), TOUCH_MS);
			},
			onMessage: async (evt, ws) => {
				if (typeof evt.data !== 'string') return;
				let raw: unknown;
				try {
					raw = JSON.parse(evt.data);
				} catch {
					return;
				}
				const parsed = clientMessage.safeParse(raw);
				if (!parsed.success) return reportDiscarded(userId, raw, parsed.error);
				const msg = parsed.data;

				try {
					if (feed && await handlePlay(msg, {
						character,
						characterId: bound(ws),
						ws,
						feed,
						// the row *is* the simulation's input: levels, upgrades and
						// overdrive as they are now, not as they were at connect
						freshCharacter: async () => (await resolveCharacter(userId))?.character,
					})) return;
				} catch (e) {
					console.error('[play]', msg.type, 'failed for', character.id, e);
					return;
				}

				try {
					if (await handleMultiplayer(msg, bound(ws), ws, scores)) return;
				} catch (e) {
					console.error('[mp]', msg.type, 'failed for', character.id, e);
					return;
				}

				if (msg.type === 'chat') {
					const now = await currentRow();
					await handleChat({
						characterId: now.id,
						name: now.name,
						color: await nameColor(user.id),
					}, user.id, msg.channel, msg.text);
				} else if (msg.type === 'pm') {
					const now = await currentRow();
					await handlePm({
						userId: user.id,
						characterId: now.id,
						name: now.name,
						color: await nameColor(user.id),
					}, msg.to, msg.text);
				} else if (msg.type === 'status') {
					// The client reports idle/afk from input activity; ignore it while
					// a play is live so it can't clobber the server-set `playing`.
					const id = bound(ws);
					if (!(await isPlaying(id))) await update(id, { status: msg.status });
				} else if (msg.type === 'version') {
					hub.noteVersion(ws, msg.version);
					await recordAdoption(bound(ws), msg.version, msg.platform);
				}
			},
			onClose: (_e, ws) => {
				if (beat) clearInterval(beat);
				feed?.stop();
				scores?.stop();
				// read before the remove, which is what forgets where it belonged
				const id = bound(ws);
				hub.remove(ws);
				if (!hub.isLocal(id)) void leave(id);
			},
		};
	}));

	return { injectWebSocket };
};
