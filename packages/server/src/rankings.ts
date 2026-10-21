import { rankValue } from '@oss-idle/shared/scoreOrder';
import { effectiveLevelOf } from '@oss-idle/shared/sim/skills/levelCurve';
import {
	and,
	count,
	desc,
	eq,
	isNull,
	inArray,
} from 'drizzle-orm';
import {
	Skills,
	type SkillName,
} from '@oss-idle/shared/skills';
import { redis } from './redis';
import { db } from './db/client';
import {
	characters,
	RANK_HISTORY_DAYS,
	type CharacterRow,
} from './db/schema/character';
import { character_totals } from './db/schema/character_totals';
import { users } from './db/schema/user';
import { best } from './db/schema/best';
import {
	characterMedals,
	getMedals,
} from './db/schema/character_medal';
import { medalWeight } from '@oss-idle/shared/achievements/catalogue';
import { recordProgress } from './medals';
import { redisKeyPrefix } from './env';
import {
	GoodGrades,
	type GoodGrade,
} from '@oss-idle/shared/judgement';

/**
 * Player rankings, kept in Redis sorted sets instead of recomputed on every
 * fetch. MySQL stays the source of truth; these sets are a derived index that
 * answers the two hot questions in O(log N):
 *
 *  - rank of one character    -> ZREVRANK   (the profile page: global/country/
 *                                            score/overall + best-skill rank)
 *  - a leaderboard page       -> ZREVRANGE  (the ranking listings)
 *
 * One member per character per set, scored by the metric. A score change is a
 * single ZADD - no row-by-row rank rewrites, and because the set lives in the
 * cluster's shared Redis every worker sees the update at once (an in-process
 * cache could not). Sorted-set scores are float64: exact for integers below
 * 2^53, far above any realistic xp/score.
 */

// Skills/overall are scored by *total* xp: it rises monotonically with level
// then xp, so it orders identically to (level, xp) without packing two numbers.
/** Boards built on a skill: what it holds now, what it has ever earned, and how
 *  many times it has been prestiged. `overall`/`total` are the summed columns. */
type LifetimeMetric = `lifetime:${SkillName | 'overall'}`;
type PrestigeMetric = `prestige:${SkillName | 'total'}`;
type GlobalMetric = 'pp' | 'score' | 'overall' | SkillName | GoodGrade | 'allgrades'
	| LifetimeMetric | PrestigeMetric | 'medals';
type CountryMetric = GlobalMetric;

const PREFIX = `${redisKeyPrefix}ranking:`;
// Meta keys live outside PREFIX so the rebuild's `${PREFIX}*` wipe can't delete
// the build lock out from under itself (which would let a second worker rebuild
// in parallel).
const META = `${redisKeyPrefix}rankmeta:`;
// Bump when the set layout changes so the next deploy rebuilds from MySQL.
const SCHEMA = 12;  // the medal board, and every character's best counters recorded
const builtKey = `${META}built:v${SCHEMA}`;
const lockKey = `${META}lock:v${SCHEMA}`;

const suffix = (country?: string) => country === undefined ? '' : `:c:${country || '__'}`;
const globalKey = (m: GlobalMetric) => `${PREFIX}${m}`;
const countryKey = (m: CountryMetric, country: string) => `${PREFIX}${m}${suffix(country)}`;
// One sorted set per beatmap (and per beatmap+country), scored by best score
// then accuracy. Score alone is not enough now that divine exists: it is capped
// at 1M and raises accuracy instead, so every top play would tie on score and
// the earlier one would keep the place forever.
const beatmapKey = (beatmapId: number, country?: string) =>
	`${PREFIX}bm:${beatmapId}${suffix(country)}`;

// The sort value comes from shared/scoreOrder, the same rule that decides which
// of two plays is a character's best - they have to agree, so they are one thing.
const beatmapScore = rankValue;

// Equal scores tiebreak on the winning score's id - the earlier (lower id) play
// ranks higher, matching compareScores. The id can't ride in the float64 set
// score (it would lose precision once it's a bigint), so it goes in the member:
// Redis breaks score ties by member, lexicographically. The member is
// `<invertedId>:<characterId>`, the id inverted and zero-padded to a fixed width
// so that under ZREVRANGE (member desc) a lower id sorts first. characterId
// trails it so the member still decodes back to the character.
const ID_WIDTH = 19; // fits a signed 64-bit id (max ~9.2e18)
const ID_MAX = 10n ** BigInt(ID_WIDTH) - 1n;
const beatmapMember = (characterId: number, scoreId: number | bigint) =>
	`${(ID_MAX - BigInt(scoreId)).toString().padStart(ID_WIDTH, '0')}:${characterId}`;
const memberCharacterId = (member: string) => Number(member.slice(member.indexOf(':') + 1));
// Reverse index: the score id currently in the set for each character on a
// beatmap. Lets a re-index ZREM the now-stale member, and a rank query rebuild
// the member without a DB hit. Wiped/rebuilt with the sets (shares PREFIX).
const beatmapIds = (beatmapId: number) => `${PREFIX}bm:${beatmapId}:ids`;

export const PAGE_SIZE = 50;

/** What `index` writes through: a pipeline, or one that removes instead (`unindexCharacter`). */
type Indexer = { zadd: (key: string, score: number, member: string) => unknown };

/** Add/refresh every set entry for one character in a single pipeline. */
function index(
	pipeline: Indexer,
	data: Awaited<ReturnType<typeof getCharacterFields>>,
	medals: string[],
) {
	if (!data) return;

	const member = String(data.character.id);
	const weight = medalWeight(medals);
	pipeline.zadd(globalKey('medals'), weight, member);
	pipeline.zadd(countryKey('medals', data.user.country), weight, member);
	pipeline.zadd(globalKey('pp'), Number(data.character.pp), member);
	pipeline.zadd(globalKey('score'), data.character_totals?.rankedScore ?? 0, member);
	pipeline.zadd(globalKey('overall'), data.character.overallTotalXp, member);
	pipeline.zadd(countryKey('pp', data.user.country), Number(data.character.pp), member);
	pipeline.zadd(
		countryKey('score', data.user.country),
		data.character_totals?.rankedScore ?? 0,
		member,
	);
	pipeline.zadd(countryKey('overall', data.user.country), data.character.overallTotalXp, member);
	// skill boards rank on the level the listings show, so the page reads in the
	// same order as its own numbers
	let prestiges = 0;
	for (const skill of Skills) {
		const level = effectiveLevelOf(
			data.character[`${skill}Level`],
			data.character[`${skill}Xp`],
			data.character[`${skill}Prestige`],
		);
		pipeline.zadd(globalKey(skill), level, member);
		pipeline.zadd(countryKey(skill, data.user.country), level, member);

		// what the skill has ever earned - spending never takes from this
		const lifetime = data.character[`${skill}LifetimeXp`];
		pipeline.zadd(globalKey(`lifetime:${skill}`), lifetime, member);
		pipeline.zadd(countryKey(`lifetime:${skill}`, data.user.country), lifetime, member);

		const prestige = data.character[`${skill}Prestige`];
		prestiges += prestige;
		pipeline.zadd(globalKey(`prestige:${skill}`), prestige, member);
		pipeline.zadd(countryKey(`prestige:${skill}`, data.user.country), prestige, member);
	}
	// the summed columns: lifetime overall is already the sum of the skills'
	pipeline.zadd(globalKey('lifetime:overall'), data.character.overallLifetimeXp, member);
	pipeline.zadd(
		countryKey('lifetime:overall', data.user.country),
		data.character.overallLifetimeXp,
		member,
	);
	pipeline.zadd(globalKey('prestige:total'), prestiges, member);
	pipeline.zadd(countryKey('prestige:total', data.user.country), prestiges, member);
	let allgrades = 0;
	for (const grade of GoodGrades) {
		pipeline.zadd(globalKey(grade), data.character_totals?.[grade] ?? 0, member);
		pipeline.zadd(countryKey(grade, data.user.country), data.character_totals?.[grade] ?? 0, member);
		allgrades += data.character_totals?.[grade] ?? 0;
	}
	pipeline.zadd(globalKey('allgrades'), allgrades, member);
	pipeline.zadd(countryKey('allgrades', data.user.country), allgrades, member);
}

const getCharacterFields = async (id: number) => {
	const [row] = await db
		.select()
		.from(characters)
		.leftJoin(character_totals, eq(character_totals.id, characters.id))
		.innerJoin(users, eq(users.id, characters.userId))
		.where(eq(characters.id, id))
		.limit(1);
	if (!row) return;
	return row;
};

/** A restricted account is in no ranking and no leaderboard. */
const visible = isNull(users.restrictedAt);

/** Re-index one character after its metrics change. Called once per finalized
 *  play and on character creation. */
export const reindexCharacter = async (id: number) => {
	const character = await getCharacterFields(id);
	if (!character || character.user.restrictedAt) return;
	await recordProgress(id);
	const pipeline = redis.pipeline();
	index(pipeline, character, (await getMedals(id)).map(m => m.medalId));
	await pipeline.exec();
	await refreshTodayRank(character.character);
};

/** A pp change moves today's rank: rewrite the current day's history sample
 *  (append it if the daily sweep hasn't reached this character yet). */
const refreshTodayRank = async (row: Pick<CharacterRow, 'id' | 'rankHistory'>) => {
	const rank = await globalRank('pp', row.id);
	if (rank === undefined) return;
	const today = new Date().toISOString().slice(0, 10);
	const previous = row.rankHistory ?? {
		date: '', ranks: [],
	};
	const ranks = previous.date === today
		? [...previous.ranks.slice(0, -1), rank]
		: [...previous.ranks, rank].slice(-RANK_HISTORY_DAYS);
	await db
		.update(characters)
		.set({
			rankHistory: {
				date: today, ranks,
			},
		})
		.where(eq(characters.id, row.id));
};

/** 1-based rank, or undefined when the character is not in the set. */
const rankIn = async (key: string, id: number): Promise<number | undefined> => {
	const r = await redis.zrevrank(key, String(id));
	return r === null ? undefined : r + 1;
};

export const globalRank = (m: GlobalMetric, id: number) => rankIn(globalKey(m), id);

/** The share of players with pp that rank at or above this character, in percent. */
export const ppTopPercent = async (id: number): Promise<number | undefined> => {
	const key = globalKey('pp');
	const [rank, players] = await Promise.all([rankIn(key, id), redis.zcount(key, '(0', '+inf')]);
	return rank && players ? 100 * rank / players : undefined;
};

/** {@link globalRank} for many characters in one round trip, in order. */
export const globalRanks = async (
	m: GlobalMetric,
	ids: number[],
): Promise<(number | undefined)[]> => {
	if (!ids.length) return [];
	const pipeline = redis.pipeline();
	for (const id of ids) pipeline.zrevrank(globalKey(m), String(id));
	const res = await pipeline.exec();
	return (res ?? []).map(([err, r]) => err || r === null ? undefined : (r as number) + 1);
};
export const countryRank = (
	m: CountryMetric,
	country: string, 
	id: number,
) => rankIn(countryKey(m, country), id);

/** The single skill this character ranks highest in, globally. */
export async function bestSkillRank(id: number): Promise<{
	skill: SkillName; 
	rank: number 
} | undefined> {
	const pipeline = redis.pipeline();
	for (const s of Skills) pipeline.zrevrank(globalKey(s), String(id));
	const res = await pipeline.exec();

	let best: { skill: SkillName; rank: number } | undefined;
	res?.forEach(([err, value], i) => {
		if (err || value === null) return;
		const rank = (value as number) + 1;
		if (!best || rank < best.rank) best = {
			skill: Skills[i], rank, 
		};
	});
	return best;
}

/** The character ids on a leaderboard page, in rank order. */
const pageIds = async (key: string, page: number): Promise<number[]> => {
	const start = (page - 1) * PAGE_SIZE;
	const ids = await redis.zrevrange(key, start, start + PAGE_SIZE - 1);
	return ids.map(Number);
};

/** Hydrate ranked ids into the joined rows the listings render, in rank order. */
async function hydrate(ids: number[]) {
	if (ids.length === 0) return [];
	const rows = await db
		.select({
			character: characters,
			character_totals,
			// the account row holds private ids (Discord, Stripe): only what the boards show
			user: {
				id: users.id, country: users.country, avatarUrl: users.avatarUrl,
			},
		})
		.from(characters)
		.innerJoin(character_totals, eq(character_totals.id, characters.id))
		.innerJoin(users, eq(users.id, characters.userId))
		.where(inArray(characters.id, ids));
	const byId = new Map(rows.map(r => [r.character.id, r]));
	return ids.map(id => byId.get(id)).filter((r): r is NonNullable<typeof r> => !!r);
}

/** A board narrowed to some characters (a player and their friends), ranked
 *  among themselves. Characters not on the board are left out. */
const amongPageIds = async (key: string, page: number, among: number[]): Promise<number[]> => {
	if (!among.length) return [];
	const pipeline = redis.pipeline();
	for (const id of among) pipeline.zscore(key, String(id));
	const res = await pipeline.exec();
	const start = (page - 1) * PAGE_SIZE;
	return among
		.map((id, i) => ({
			id, score: res?.[i]?.[1],
		}))
		.filter(r => r.score !== null && r.score !== undefined)
		.sort((a, b) => Number(b.score) - Number(a.score))
		.slice(start, start + PAGE_SIZE)
		.map(r => r.id);
};

const hydratePage = async (key: string, page: number, among?: number[]) =>
	hydrate(among ? await amongPageIds(key, page, among) : await pageIds(key, page));

/** Countries that have at least one player, with their player count, most
 *  populated first. Cached briefly - the list changes only when a new country's
 *  first player joins, and a few minutes of staleness on a filter list is fine. */
let countriesCache: { at: number; rows: { country: string; count: number }[] } | undefined;
const COUNTRIES_TTL = 5 * 60 * 1000;

export async function playerCountries(): Promise<{ country: string; count: number }[]> {
	if (countriesCache && Date.now() - countriesCache.at < COUNTRIES_TTL) return countriesCache.rows;
	const rows = await db
		.select({
			country: users.country, count: count(), 
		})
		.from(characters)
		.innerJoin(users, eq(users.id, characters.userId))
		.groupBy(users.country)
		.orderBy(desc(count()));
	countriesCache = {
		at: Date.now(), rows, 
	};
	return rows;
}

const metricKey = (
	m: GlobalMetric, 
	country?: string,
) => country === undefined ? globalKey(m) : countryKey(m, country);

export const skillPage = (
	skill: GlobalMetric,
	page: number,
	country?: string,
	among?: number[],
) => hydratePage(metricKey(skill, country), page, among);
export const gradesPage = (
	grade: GoodGrade | 'all', 
	page: number,
	country?: string,
	among?: number[],
) => hydratePage(metricKey(grade === 'all' ? 'allgrades' : grade, country), page, among);
export const ppPage = (
	page: number,
	country?: string,
	among?: number[],
) => hydratePage(metricKey('pp', country), page, among);
export const scorePage = (
	page: number, 
	country?: string,
	among?: number[],
) => hydratePage(metricKey('score', country), page, among);

const medalCounts = (ids: number[]) => db
	.select({
		id: characterMedals.characterId, n: count(),
	})
	.from(characterMedals)
	.where(inArray(characterMedals.characterId, ids))
	.groupBy(characterMedals.characterId);

/** The medal board, each row with its medals held and the board's value. */
export const medalsPage = async (page: number, country?: string, among?: number[]) => {
	const key = metricKey('medals', country);
	const rows = await hydratePage(key, page, among);
	if (!rows.length) return [];
	const ids = rows.map(r => r.character.id);
	const pipeline = redis.pipeline();
	for (const id of ids) pipeline.zscore(key, String(id));
	const [scores, counts] = await Promise.all([pipeline.exec(), medalCounts(ids)]);
	const held = new Map(counts.map(r => [r.id, r.n]));
	return rows.map((row, i) => ({
		...row,
		medals: {
			held: held.get(row.character.id) ?? 0, score: Number(scores?.[i]?.[1] ?? 0),
		},
	}));
};

/** Per-beatmap leaderboard: the character ids with a best on this map, in score
 *  order (global or within one country). The route hydrates the `best` rows. */
export const beatmapPageIds = async (
	beatmapId: number,
	page: number,
	country?: string,
): Promise<number[]> => {
	const start = (page - 1) * PAGE_SIZE;
	const members = await redis.zrevrange(beatmapKey(beatmapId, country), start, start + PAGE_SIZE - 1);
	return members.map(memberCharacterId);
};

export async function beatmapRank(
	beatmapId: number, 
	characterId: number, 
	country?: string,
): Promise<number | undefined> {
	const id = await redis.hget(beatmapIds(beatmapId), String(characterId));
	if (id === null) return undefined;
	const r = await redis.zrevrank(
		beatmapKey(beatmapId, country),
		beatmapMember(characterId, BigInt(id)),
	);
	return r === null ? undefined : r + 1;
}

/** Re-index a character's best on one beatmap after a play improves it. */
export async function reindexBeatmap(characterId: number, beatmapId: number): Promise<void> {
	const [row] = await db
		.select({
			id: best.id, score: best.score, accuracy: best.accuracy, country: users.country, 
		})
		.from(best)
		.innerJoin(characters, eq(characters.id, best.characterId))
		.innerJoin(users, eq(users.id, characters.userId))
		.where(and(eq(best.beatmapId, beatmapId), eq(best.characterId, characterId), visible))
		.limit(1);
	if (!row) return;
	const member = beatmapMember(characterId, row.id);
	const prev = await redis.hget(beatmapIds(beatmapId), String(characterId));
	const pipeline = redis.pipeline();
	if (prev !== null && prev !== String(row.id)) {
		const stale = beatmapMember(characterId, BigInt(prev));
		pipeline.zrem(beatmapKey(beatmapId), stale);
		pipeline.zrem(beatmapKey(beatmapId, row.country), stale);
	}
	const value = beatmapScore(row.score, row.accuracy);
	pipeline.zadd(beatmapKey(beatmapId), value, member);
	pipeline.zadd(beatmapKey(beatmapId, row.country), value, member);
	pipeline.hset(beatmapIds(beatmapId), String(characterId), String(row.id));
	await pipeline.exec();
}

/** Take a character off every ranking and every beatmap leaderboard (a restriction). */
export const unindexCharacter = async (id: number): Promise<void> => {
	const character = await getCharacterFields(id);
	if (!character) return;
	const pipeline = redis.pipeline();
	index({ zadd: (key, _score, member) => pipeline.zrem(key, member) }, character, []);
	const bests = await db
		.select({
			id: best.id, beatmapId: best.beatmapId,
		})
		.from(best)
		.where(eq(best.characterId, id));
	for (const b of bests) {
		const member = beatmapMember(id, b.id);
		pipeline.zrem(beatmapKey(b.beatmapId), member);
		pipeline.zrem(beatmapKey(b.beatmapId, character.user.country), member);
		pipeline.hdel(beatmapIds(b.beatmapId), String(id));
	}
	await pipeline.exec();
};

/** Put a character back on every board (a restriction lifted). */
export const reindexCharacterEverywhere = async (id: number): Promise<void> => {
	await reindexCharacter(id);
	const bests = await db
		.select({ beatmapId: best.beatmapId })
		.from(best)
		.where(eq(best.characterId, id));
	for (const b of bests) await reindexBeatmap(id, b.beatmapId);
};

/** Drop a beatmap's leaderboard sets (global, per-country and the reverse
 *  index). For unranking: the map's scores are gone, so the index must go too. */
export async function unindexBeatmap(beatmapId: number): Promise<void> {
	await redis.del(beatmapKey(beatmapId));
	for await (const key of scanKeys(`${PREFIX}bm:${beatmapId}:*`)) await redis.del(key);
}

/** Rebuild every set from MySQL. One DB pass, pipelined in chunks. */
export async function rebuildAll(): Promise<void> {
	for await (const key of scanKeys(`${PREFIX}*`)) await redis.del(key);

	const rows = await db
		.select()
		.from(characters)
		.leftJoin(character_totals, eq(character_totals.id, characters.id))
		.innerJoin(users, eq(users.id, characters.userId))
		.where(visible)
		.orderBy(desc(characters.pp));
	const held = new Map<number, string[]>();
	for (const m of await db.select().from(characterMedals)) {
		held.set(m.characterId, [...held.get(m.characterId) ?? [], m.medalId]);
	}

	for (const row of rows) await recordProgress(row.character.id);

	let pipeline = redis.pipeline();
	for (let i = 0; i < rows.length; i++) {
		index(pipeline, rows[i], held.get(rows[i].character.id) ?? []);
		if (i % 200 === 199) {
			await pipeline.exec();
			pipeline = redis.pipeline();
		}
	}
	await pipeline.exec();

	const bests = await db
		.select({
			id: best.id, beatmapId: best.beatmapId, characterId: best.characterId, score: best.score,
			accuracy: best.accuracy, country: users.country, 
		})
		.from(best)
		.innerJoin(characters, eq(characters.id, best.characterId))
		.innerJoin(users, eq(users.id, characters.userId))
		.where(visible);

	pipeline = redis.pipeline();
	for (let i = 0; i < bests.length; i++) {
		const b = bests[i];
		const member = beatmapMember(b.characterId, b.id);
		const value = beatmapScore(b.score, b.accuracy);
		pipeline.zadd(beatmapKey(b.beatmapId), value, member);
		pipeline.zadd(beatmapKey(b.beatmapId, b.country), value, member);
		pipeline.hset(beatmapIds(b.beatmapId), String(b.characterId), String(b.id));
		if (i % 200 === 199) {
			await pipeline.exec();
			pipeline = redis.pipeline();
		}
	}
	await pipeline.exec();
}

/** Append today's global pp rank to every character's stored history, once
 *  per UTC day (one worker wins the day's lock; the rest and later calls
 *  return immediately). */
export const sweepRankHistory = async (): Promise<void> => {
	const today = new Date().toISOString().slice(0, 10);
	const doneKey = `${META}rankhistory:${today}`;
	if (await redis.exists(doneKey)) return;
	const got = await redis.set(`${doneKey}:lock`, '1', 'EX', 600, 'NX');
	if (got !== 'OK') return;
	try {
		const members = await redis.zrevrange(globalKey('pp'), 0, -1);
		const rows = await db
			.select({
				id: characters.id, rankHistory: characters.rankHistory,
			})
			.from(characters);
		const history = new Map(rows.map(row => [row.id, row.rankHistory]));

		for (let rank = 1; rank <= members.length; rank++) {
			const id = Number(members[rank - 1]);
			if (!history.has(id)) continue;
			const previous = history.get(id) ?? {
				date: '', ranks: [],
			};
			if (previous.date === today) continue;
			const ranks = [...previous.ranks, rank].slice(-RANK_HISTORY_DAYS);
			await db
				.update(characters)
				.set({
					rankHistory: {
						date: today, ranks,
					},
				})
				.where(eq(characters.id, id));
		}
		await redis.set(doneKey, '1', 'EX', 2 * 86_400);
	} finally {
		await redis.del(`${doneKey}:lock`);
	}
};

async function* scanKeys(match: string): AsyncGenerator<string> {
	let cursor = '0';
	do {
		const [next, keys] = await redis.scan(cursor, 'MATCH', match, 'COUNT', 500);
		cursor = next;
		yield* keys;
	} while (cursor !== '0');
}

/** Whether the pp board holds exactly MySQL's characters at their pp. Fails
 *  when the database was swapped under the index (a restore, a staging clone). */
const indexMatchesDb = async () => {
	const rows = await db
		.select({
			id: characters.id, pp: characters.pp,
		})
		.from(characters)
		.innerJoin(users, eq(users.id, characters.userId))
		.where(visible);
	const scores = await redis.zrange(globalKey('pp'), 0, -1, 'WITHSCORES');
	if (scores.length !== rows.length * 2) return false;
	const indexed = new Map<string, number>();
	for (let i = 0; i < scores.length; i += 2) indexed.set(scores[i], Number(scores[i + 1]));
	return rows.every(row => indexed.get(String(row.id)) === Number(row.pp));
};

/** Build the sets on boot unless they are already built for this schema and
 *  still match MySQL, elected to a single cluster worker. */
export async function ensureRankings(): Promise<void> {
	if (await redis.exists(builtKey) && await indexMatchesDb()) return;
	const got = await redis.set(lockKey, '1', 'EX', 300, 'NX');
	if (got !== 'OK') return;
	try {
		await rebuildAll();
		await redis.set(builtKey, '1');
		console.log('Rankings index built.');
	} finally {
		await redis.del(lockKey);
	}
}
