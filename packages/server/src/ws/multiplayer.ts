import { randomUUID } from 'node:crypto';
import type { WSContext } from 'hono/ws';
import {
	and,
	eq,
	ne,
} from 'drizzle-orm';
import { INTRO_SET_ID } from '@osu-idle/shared/beatmap';
import type { ClientMessage } from '@osu-idle/shared/community/wire';
import {
	isMatchChannel,
	matchChannel,
	MAX_SLOTS,
	type Match,
	type MatchBeatmap,
	type MatchSlot,
	type PlayerSlot,
	type RoundScore,
} from '@osu-idle/shared/multiplayer';
import { redis } from '../redis';
import { redisKeyPrefix } from '../env';
import { db } from '../db/client';
import { characters } from '../db/schema/character';
import { isRestricted } from '../db/schema/user';
import {
	beatmapListColumns,
	beatmaps,
} from '../db/schema/beatmap';
import { beatmapset } from '../db/schema/beatmapset';
import { liveDiffCondition } from '../beatmaps/catalog';
import {
	playEnds,
	playTimeline,
	isPlaying,
	startPlay,
	type PlaySample,
} from '../play';
import { LEAD_IN_MS } from '@osu-idle/shared/sim/maniaGame';
import { hub } from './hub';
import { areOnline } from './presence';
import { BOT_COLOR } from './chat';
import { Judgements } from '@osu-idle/shared/judgement';
import type { NewScoreRow } from '../db/schema/score';
import {
	closeMatch,
	endGame,
	openMatch,
	recordEvent,
	startGame,
	type GameScoreDetail,
} from '../matchHistory';

/**
 * Multiplayer matches. Every match lives in one Redis hash (id -> JSON) and every
 * change is published whole to every client, so the lobby and the match setup
 * screens read the same thing. Changes to one match run under its lock, since
 * any cluster worker may hold one of its players' sockets.
 */

const MATCHES = `${redisKeyPrefix}mp:matches`;
/** character id -> the match it is in */
const MEMBERS = `${redisKeyPrefix}mp:members`;
const lockKey = (id: number) => `${redisKeyPrefix}mp:lock:${id}`;
/** the round being played: every player's checkpoints, kept apart from the match */
const roundKey = (id: number) => `${redisKeyPrefix}mp:round:${id}`;
const ROUND_TTL_S = 60 * 60;
/** character id -> since when it has had no socket: a refresh or a dropped
 *  connection keeps the seat for a while */
const AWAY = `${redisKeyPrefix}mp:away`;
const AWAY_GRACE_MS = 60 * 1000;
const FEED_TICK_MS = 250;

const LOCK_MS = 5000;
const UNLOCK = `
if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end
return 0
`;

type Stored = Omit<Match, 'locked'> & {
	password: string,
	endsAt?: number,
	/** the round being played, to tell its record from the last one's */
	roundStartedAt?: number,
};

type RoundPlayer = {
	characterId: number,
	startedAt: number,
	/** when it was due to end at the start: a skip moves both by the same amount */
	endsAt: number,
	samples: PlaySample[],
	final: RoundScore,
	/** what the match history shows of it */
	detail: GameScoreDetail,
};

type Round = {
	beatmapId: number,
	/** its row in the match history */
	gameId?: number,
	startedAt: number,
	players: RoundPlayer[],
};

const readRound = async (id: number): Promise<Round | undefined> => {
	const raw = await redis.get(roundKey(id));
	return raw ? JSON.parse(raw) as Round : undefined;
};

/** Every round player's score at the live position; a play that is over shows
 *  its final score. */
const liveScores = async (round: Round): Promise<RoundScore[]> => {
	const ends = await playEnds(round.players.map(p => p.characterId));
	return round.players.map((p, i) => {
		const end = ends[i];
		if (end === undefined) return p.final;
		const pos = Date.now() - (p.startedAt + end - p.endsAt) - LEAD_IN_MS;
		const at = p.samples.filter(([t]) => t <= pos).at(-1);
		return {
			characterId: p.characterId,
			score: at?.[3] ?? 0,
			combo: at?.[4] ?? 0,
			failed: at?.[5] ?? false,
		};
	});
};

/** A round is over once none of its plays is still running. */
const roundOver = async (m: Stored, round: Round | undefined): Promise<boolean> => {
	if (!m.playing) return false;
	// the plays are still being started
	if (round?.startedAt !== m.roundStartedAt) return m.endsAt !== undefined && m.endsAt <= Date.now();
	const ends = await playEnds(round!.players.map(p => p.characterId));
	return ends.every(e => e === undefined);
};

/** What a started play will end as. Known up front: the server simulated it whole. */
const judgementsOf = (draft: NewScoreRow) =>
	Object.fromEntries(Judgements.map(j => [j, draft[j] ?? 0])) as GameScoreDetail['judgements'];

/** A round play as its result screen shows it. Failed ones are never saved, so
 *  this is the only copy. */
const roundResult = (characterId: number, draft: NewScoreRow): RoundScore['result'] => ({
	characterId,
	beatmapId: draft.beatmapId,
	score: draft.score ?? 0,
	accuracy: Number(draft.accuracy ?? 0),
	maxCombo: draft.maxCombo ?? 0,
	judgements: judgementsOf(draft),
	grade: draft.grade,
	pp: Number(draft.pp ?? 0),
	ur: Number(draft.ur ?? 0),
	pfc: draft.pfc ?? false,
	rate: Number(draft.rate ?? 1),
	playedAt: new Date(draft.playedAt ?? Date.now()).getTime(),
});

const roundPlayer = async (characterId: number): Promise<RoundPlayer | undefined> => {
	const play = await playTimeline(characterId);
	if (!play?.samples) return undefined;
	return {
		characterId,
		startedAt: play.startedAt,
		endsAt: play.endsAt,
		samples: play.samples,
		final: {
			characterId,
			score: play.draft.score ?? 0,
			combo: play.draft.maxCombo ?? 0,
			failed: play.failedAt !== undefined,
			accuracy: Number(play.draft.accuracy ?? 0),
			result: roundResult(characterId, play.draft),
		},
		detail: {
			grade: play.failedAt !== undefined ? 'F' : play.draft.grade,
			judgements: judgementsOf(play.draft),
		},
	};
};

const toDTO = (m: Stored): Match => ({
	id: m.id,
	name: m.name,
	locked: m.password !== '',
	hostId: m.hostId,
	beatmap: m.beatmap,
	slots: m.slots,
	playing: m.playing,
	lastRound: m.lastRound,
	changingBeatmap: m.changingBeatmap,
});

const players = (m: Stored): PlayerSlot[] =>
	m.slots.filter((s): s is PlayerSlot => s.state === 'player');

const slotOf = (m: Stored, characterId: number): PlayerSlot | undefined =>
	players(m).find(s => s.characterId === characterId);

const read = async (id: number): Promise<Stored | undefined> => {
	const raw = await redis.hget(MATCHES, String(id));
	return raw ? JSON.parse(raw) as Stored : undefined;
};

const memberOf = async (characterId: number): Promise<number | undefined> => {
	const id = await redis.hget(MEMBERS, String(characterId));
	return id ? Number(id) : undefined;
};

const withLock = async <T>(id: number, fn: () => Promise<T>): Promise<T> => {
	const token = randomUUID();
	for (let tries = 0; await redis.set(lockKey(id), token, 'PX', LOCK_MS, 'NX') !== 'OK'; tries++) {
		if (tries > 100) throw new Error(`match ${id} stayed locked`);
		await new Promise(r => setTimeout(r, 20));
	}
	try {
		return await fn();
	} finally {
		await redis.eval(UNLOCK, 1, lockKey(id), token);
	}
};

/** Store and publish a match, or drop it once nobody is left. The host passes
 *  to the first player when they leave. */
const save = async (m: Stored): Promise<void> => {
	const left = players(m);
	if (!left.length) {
		await redis.hdel(MATCHES, String(m.id));
		// emptied mid-round: the game still ends, on the outcomes known at its start
		const round = m.playing ? await readRound(m.id) : undefined;
		if (round?.gameId && round.startedAt === m.roundStartedAt) endGame(round.gameId, round.players);
		await redis.del(roundKey(m.id));
		closeMatch(m.id);
		hub.broadcast({
			type: 'mp:remove', id: m.id,
		});
		return;
	}
	if (!slotOf(m, m.hostId)) m.hostId = left[0].characterId;
	await redis.hset(MATCHES, String(m.id), JSON.stringify(m));
	hub.broadcast({
		type: 'mp:update', match: toDTO(m),
	});
};

/** Apply a change to a match under its lock. `fn` returns false when it changed
 *  nothing, so nothing is published. */
const change = (
	id: number,
	fn: (m: Stored) => boolean | void,
): Promise<Stored | undefined> => withLock(id, async () => {
	const m = await read(id);
	if (!m) return undefined;
	const host = m.hostId;
	if (fn(m) === false) return m;
	await save(m);
	if (m.hostId !== host && players(m).length) recordEvent(id, 'host', m.hostId);
	return m;
});

/** Change the match the character is in, as one of its players. */
const changeOwn = async (
	characterId: number,
	fn: (m: Stored, slot: PlayerSlot) => boolean | void,
): Promise<void> => {
	const id = await memberOf(characterId);
	if (id === undefined) return;
	await change(id, m => {
		const slot = slotOf(m, characterId);
		return slot ? fn(m, slot) : false;
	});
};

const asHost = (characterId: number, fn: (m: Stored) => boolean | void) =>
	changeOwn(characterId, m => m.hostId === characterId && !m.playing ? fn(m) : false);

const seat = (characterId: number): PlayerSlot => ({
	state: 'player', characterId, ready: false, noMap: false, playing: false,
});

/** Give the host's crown to another player in the match. */
const giveHost = (characterId: number, to: number) => asHost(characterId, m => {
	if (!slotOf(m, to)) return false;
	m.hostId = to;
});

const kick = async (characterId: number, who: number): Promise<void> => {
	const id = await memberOf(characterId);
	if (id === undefined || who === characterId || await memberOf(who) !== id) return;
	const m = await read(id);
	if (m?.hostId === characterId) await leaveMatch(who, 'kick');
};

export const leaveMatch = async (
	characterId: number,
	event: 'leave' | 'kick' = 'leave',
): Promise<void> => {
	const id = await memberOf(characterId);
	if (id === undefined) return;
	await redis.hdel(MEMBERS, String(characterId));
	await change(id, m => {
		const at = m.slots.findIndex(s => s.state === 'player' && s.characterId === characterId);
		if (at < 0) return false;
		m.slots[at] = { state: 'open' };
		// before saving: an empty match closes as it saves
		recordEvent(id, event, characterId);
	});
};

/** MakiseBot's line on entering a match (osu!'s BanchoBot one), linking its history. */
const historyLine = (characterId: number, matchId: number): void => hub.sendTo(characterId, {
	type: 'chat',
	line: {
		id: randomUUID(),
		kind: 'system',
		channel: matchChannel(matchId),
		name: 'MakiseBot',
		color: BOT_COLOR,
		text: 'Match history available here.',
		link: {
			label: 'here', path: `matches/${matchId}`,
		},
		at: Date.now(),
	},
});

type JoinAnswer = {
	match?: Match,
	/** a running play has to be aborted first: its round would start without it */
	reason?: 'full' | 'password' | 'gone' | 'playing' | 'restricted',
};

/** Whether the character's account is restricted: it can't play, so it can't sit in a match. */
const restrictedCharacter = async (characterId: number): Promise<boolean> => {
	const [row] = await db
		.select({ userId: characters.userId })
		.from(characters)
		.where(eq(characters.id, characterId))
		.limit(1);
	return Boolean(row && await isRestricted(row.userId));
};

const create = async (
	characterId: number,
	{ name, password, size, isPublic, beatmapId }: Extract<ClientMessage, { type: 'mp:create' }>,
): Promise<JoinAnswer> => {
	if (await restrictedCharacter(characterId)) return { reason: 'restricted' };
	if (await isPlaying(characterId)) return { reason: 'playing' };
	const beatmap = beatmapId === undefined ? undefined : await findBeatmap(beatmapId);
	await leaveMatch(characterId);
	const id = await openMatch(name, isPublic);
	recordEvent(id, 'create', characterId);
	const m: Stored = {
		id,
		name,
		password,
		hostId: characterId,
		beatmap,
		changingBeatmap: false,
		slots: Array.from({ length: MAX_SLOTS }, (_, i): MatchSlot =>
			i === 0 ? seat(characterId) : { state: i < size ? 'open' : 'locked' }),
		playing: false,
	};
	await redis.hset(MEMBERS, String(characterId), String(id));
	await withLock(id, () => save(m));
	historyLine(characterId, id);
	return { match: toDTO(m) };
};

const join = async (
	characterId: number,
	{ id, password }: Extract<ClientMessage, { type: 'mp:join' }>,
): Promise<JoinAnswer> => {
	if (await memberOf(characterId) !== id) {
		if (await restrictedCharacter(characterId)) return { reason: 'restricted' };
		if (await isPlaying(characterId)) return { reason: 'playing' };
		await leaveMatch(characterId);
	}
	const answer: JoinAnswer = { reason: 'gone' };
	let seated = false;
	const m = await change(id, m => {
		answer.reason = undefined;
		if (slotOf(m, characterId)) return false;
		if (m.password && m.password !== password) {
			answer.reason = 'password';
			return false;
		}
		const open = m.slots.findIndex(s => s.state === 'open');
		if (open < 0) {
			answer.reason = 'full';
			return false;
		}
		m.slots[open] = seat(characterId);
		seated = true;
	});
	if (!m || answer.reason) return answer;
	await redis.hset(MEMBERS, String(characterId), String(id));
	if (seated) {
		recordEvent(id, 'join', characterId);
		historyLine(characterId, id);
	}
	return { match: toDTO(m) };
};

/** A live ranked diff, as a match shows it. Never the intro set: it is
 *  exempt from the ranking rules, but no match is played on it. */
const findBeatmap = async (beatmapId: number): Promise<MatchBeatmap | undefined> => {
	const [row] = await db
		.select({
			...beatmapListColumns, creator: beatmapset.creator,
		})
		.from(beatmaps)
		.innerJoin(beatmapset, eq(beatmapset.id, beatmaps.setId))
		.where(and(
			eq(beatmaps.id, beatmapId),
			ne(beatmaps.setId, INTRO_SET_ID),
			liveDiffCondition,
		))
		.limit(1);
	return row && {
		id: row.id,
		setId: row.setId,
		artist: row.artist,
		title: row.title,
		version: row.version,
		creator: row.creator,
		sr: Number(row.sr),
	};
};

/** The host picks the map. One that can't be played in a match keeps the
 *  map the room had. */
const setBeatmap = async (characterId: number, beatmapId: number): Promise<void> => {
	const beatmap = await findBeatmap(beatmapId);
	await asHost(characterId, m => {
		m.changingBeatmap = false;
		if (!beatmap) return;
		m.beatmap = beatmap;
		for (const s of players(m)) s.ready = false;
	});
};

/** Start the ranked play of every player who has the map, ready or not (osu!'s
 *  host can force a start), together. The plays are simulated outside the lock -
 *  a long map takes a while. */
const start = async (characterId: number): Promise<void> => {
	let beatmapId: number | undefined;
	let round: number[] = [];
	let rates: number[] = [];
	const startedAt = Date.now();
	await asHost(characterId, m => {
		const withMap = players(m).filter(s => !s.noMap);
		if (!m.beatmap || m.changingBeatmap || !withMap.length) return false;
		beatmapId = m.beatmap.id;
		round = withMap.map(s => s.characterId);
		rates = withMap.map(s => s.rate ?? 1);
		m.playing = true;
		m.roundStartedAt = startedAt;
		m.lastRound = undefined;
		// seats show playing only once the plays exist (below): a client sent into
		// gameplay before that would start a solo play of its own
		for (const s of players(m)) s.ready = false;
	});
	if (beatmapId === undefined) return;

	const started = await Promise.all(round.map(async (id, i) => {
		const [row] = await db.select().from(characters).where(eq(characters.id, id)).limit(1);
		const result = row
			? await startPlay(row, beatmapId!, 1, rates[i]).catch(() => undefined)
			: undefined;
		// joined a play of another map = they had a solo play running: they sit out
		return result?.status === 'ranked' && result.beatmapId === beatmapId ? result.endsAt : undefined;
	}));

	const matchId = await memberOf(characterId);
	if (matchId === undefined) return;
	const timelines = await Promise.all(round
		.filter((_, i) => started[i] !== undefined)
		.map(roundPlayer));
	const gameId = timelines.some(p => p) ? await startGame(matchId, beatmapId) : undefined;
	await redis.set(roundKey(matchId), JSON.stringify({
		beatmapId, gameId, startedAt, players: timelines.filter(p => p !== undefined),
	} satisfies Round), 'EX', ROUND_TTL_S);
	await change(matchId, m => {
		for (const s of players(m)) {
			const i = round.indexOf(s.characterId);
			s.playing = i >= 0 && started[i] !== undefined;
		}
		const ends = started.filter(e => e !== undefined);
		m.playing = ends.length > 0;
		m.endsAt = ends.length ? Math.max(...ends) : undefined;
	});
};

/** Which of these players have been offline past the grace period. */
const awayTooLong = async (ids: number[]): Promise<boolean[]> => {
	if (!ids.length) return [];
	const online = await areOnline(ids);
	const now = Date.now();
	const tx = redis.multi();
	ids.forEach((id, i) => {
		if (online[i]) tx.hdel(AWAY, String(id));
		else tx.hsetnx(AWAY, String(id), String(now));
	});
	await tx.exec();
	const since = await redis.hmget(AWAY, ...ids.map(String));
	return since.map(s => s !== null && now - Number(s) > AWAY_GRACE_MS);
};

/** End finished rounds and seat-sweep players who went offline. Runs on every
 *  worker; a change that finds nothing to do publishes nothing. */
export const sweepMatches = async (): Promise<void> => {
	const raw = await redis.hvals(MATCHES);
	for (const m of raw.map(r => JSON.parse(r) as Stored)) {
		const ids = players(m).map(s => s.characterId);
		const round = m.playing ? await readRound(m.id) : undefined;
		const over = await roundOver(m, round);
		const members = ids.length ? await redis.hmget(MEMBERS, ...ids.map(String)) : [];
		const away = await awayTooLong(ids);
		const gone = ids.filter((_, i) => away[i] || members[i] !== String(m.id));
		if (!gone.length && !over) continue;
		let endedHere = false;
		await change(m.id, m => {
			m.slots = m.slots.map(s => {
				if (s.state !== 'player' || !gone.includes(s.characterId)) return s;
				recordEvent(m.id, 'leave', s.characterId);
				return { state: 'open' };
			});
			if (over && m.playing) {
				endedHere = true;
				m.playing = false;
				m.endsAt = undefined;
				m.lastRound = round && {
					beatmapId: round.beatmapId,
					startedAt: round.startedAt,
					results: round.players.map(p => p.final).sort((a, b) => b.score - a.score),
				};
				for (const s of players(m)) s.playing = false;
			}
		});
		if (endedHere && round?.gameId) endGame(round.gameId, round.players);
		for (const id of gone) {
			if (members[ids.indexOf(id)] === String(m.id)) await redis.hdel(MEMBERS, String(id));
			await redis.hdel(AWAY, String(id));
		}
	}
};

/** The characters that may read and post to a match's chat channel. */
export const channelMembers = async (channel: string): Promise<number[] | undefined> => {
	if (!isMatchChannel(channel)) return undefined;
	const m = await read(Number(channel.slice('#mp_'.length)));
	return m ? players(m).map(s => s.characterId) : [];
};

/** The match a reconnecting socket is still seated in. */
export const ownMatch = async (characterId: number): Promise<Match | undefined> => {
	const id = await memberOf(characterId);
	const m = id === undefined ? undefined : await read(id);
	return m && slotOf(m, characterId) ? toDTO(m) : undefined;
};

/** The host's commands. Returns false for anything else. */
const handleHostCommand = async (msg: ClientMessage, characterId: number): Promise<boolean> => {
	switch (msg.type) {
		case 'mp:settings':
			await asHost(characterId, m => {
				m.name = msg.name ?? m.name;
				m.password = msg.password ?? m.password;
			});
			return true;
		case 'mp:beatmap':
			await setBeatmap(characterId, msg.beatmapId);
			return true;
		case 'mp:changing':
			await asHost(characterId, m => {
				if (m.changingBeatmap === msg.changing) return false;
				m.changingBeatmap = msg.changing;
			});
			return true;
		case 'mp:lock':
			await asHost(characterId, m => {
				const slot = m.slots[msg.slot];
				if (slot?.state === 'player') return false;
				m.slots[msg.slot] = { state: slot?.state === 'open' ? 'locked' : 'open' };
			});
			return true;
		case 'mp:start':
			await start(characterId);
			return true;
		case 'mp:host':
			await giveHost(characterId, msg.characterId);
			return true;
		case 'mp:kick':
			await kick(characterId, msg.characterId);
			return true;
		default:
			return false;
	}
};

/** Handle one `mp:*` message. Returns false for anything else. */
export const handleMultiplayer = async (
	msg: ClientMessage,
	characterId: number,
	ws: WSContext,
	scores: MatchFeed | undefined,
): Promise<boolean> => {
	if (await handleHostCommand(msg, characterId)) return true;
	switch (msg.type) {
		case 'mp:watch':
			scores?.watch(msg.on);
			return true;
		case 'mp:list': {
			const raw = await redis.hvals(MATCHES);
			hub.sendLocal(ws, {
				type: 'mp:list', matches: raw.map(r => toDTO(JSON.parse(r) as Stored)),
			});
			return true;
		}
		case 'mp:create':
			hub.sendLocal(ws, {
				type: 'mp:joined', ...await create(characterId, msg),
			});
			return true;
		case 'mp:join':
			hub.sendLocal(ws, {
				type: 'mp:joined', ...await join(characterId, msg),
			});
			return true;
		case 'mp:leave':
			await leaveMatch(characterId);
			return true;
		case 'mp:ready':
			await changeOwn(characterId, (m, s) => {
				if (m.playing || s.noMap || s.ready === msg.ready) return false;
				s.ready = msg.ready;
			});
			return true;
		case 'mp:rate':
			await changeOwn(characterId, (m, s) => {
				if (m.playing || s.rate === msg.rate) return false;
				s.rate = msg.rate;
			});
			return true;
		case 'mp:noMap':
			await changeOwn(characterId, (_, s) => {
				if (s.noMap === msg.noMap) return false;
				s.noMap = msg.noMap;
				if (msg.noMap) s.ready = false;
			});
			return true;
		case 'mp:slot':
			await changeOwn(characterId, (m, s) => {
				if (m.playing || m.slots[msg.slot]?.state !== 'open') return false;
				m.slots[m.slots.indexOf(s)] = { state: 'open' };
				m.slots[msg.slot] = s;
			});
			return true;
		default:
			return false;
	}
};

/** One socket's in-game scoreboard: the round's live scores, pushed each tick
 *  while its player watches a match play. */
/** The feeds' last read of each round, shared by every watcher of the match on this worker:
 *  each one ticks 4 times a second, and a round holds every player's samples. */
const feedRounds = new Map<number, { at: number, round: Round | undefined }>();

const feedRound = async (matchId: number): Promise<Round | undefined> => {
	const hit = feedRounds.get(matchId);
	if (hit && Date.now() - hit.at < FEED_TICK_MS - 50) return hit.round;
	const round = await readRound(matchId);
	if (feedRounds.size > 200) feedRounds.clear();
	feedRounds.set(matchId, {
		at: Date.now(), round,
	});
	return round;
};

export class MatchFeed {

	private timer?: ReturnType<typeof setInterval>;

	constructor(
		private readonly characterId: () => number,
		private readonly ws: WSContext,
	) {}

	public watch(on: boolean): void {
		this.stop();
		if (!on) return;
		this.timer = setInterval(() => void this.tick(), FEED_TICK_MS);
		void this.tick();
	}

	public stop(): void {
		if (this.timer) clearInterval(this.timer);
		this.timer = undefined;
	}

	private async tick(): Promise<void> {
		const id = await memberOf(this.characterId());
		const round = id === undefined ? undefined : await feedRound(id);
		if (!round) return this.stop();
		hub.sendLocal(this.ws, {
			type: 'mp:scores', scores: await liveScores(round),
		});
	}

}
