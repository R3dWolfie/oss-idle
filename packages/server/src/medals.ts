import {
	and,
	count,
	desc,
	eq,
	gt,
	inArray,
	isNull,
	lte,
	max,
	or,
	sql,
} from 'drizzle-orm';
import type { AnyMySqlColumn } from 'drizzle-orm/mysql-core';
import { ADMIN_USER_IDS } from '@osu-idle/shared/admin';
import {
	MEDALS,
	medalXPMultiplier,
} from '@osu-idle/shared/achievements/catalogue';
import { Skills } from '@osu-idle/shared/skills';
import { maxUpgrades } from '@osu-idle/shared/upgrades';
import { db } from './db/client';
import { scores } from './db/schema/score';
import { beatmaps } from './db/schema/beatmap';
import { beatmapset } from './db/schema/beatmapset';
import { firstPlace } from './db/schema/first_place';
import { beatmaps_played } from './db/schema/beatmaps_played';
import { beatmapRequests } from './db/schema/beatmap_request';
import { users } from './db/schema/user';
import { characterProgress } from './db/schema/character_progress';
import {
	characters,
	getCharacterById,
	type CharacterRow,
} from './db/schema/character';
import {
	character_totals,
	getCharacterTotals,
} from './db/schema/character_totals';
import {
	addMedals,
	characterMedals,
	getMedals,
} from './db/schema/character_medal';
import { presenceTimezone } from './ws/presence';
import { hasChatted } from './ws/chat';
import { hub } from './ws/hub';
import { reindexCharacter } from './rankings';
import type { MedalBatch } from '@osu-idle/shared/play';

/** What a finished play adds that the database does not keep. */
export type PlayFacts = {
	/** how far into the map a failed play got, 0-1 */
	failedAt?: number,
};

const NIGHT_OWL_HOURS = [3, 4];
const FAIL_99 = 0.99;
/** TAG underground - POSSESSION [CHALLENGE], the "Possessed" medal's map */
const POSSESSION_ID = 1168087;
const PERFECT_SCORE = 1_000_000;

/** Best star rating passed and full-combo'd, and the one-off score feats. */
const scoreFacts = async (characterId: number) => {
	const [row] = await db.select({
		pass: max(sql<number>`floor(${beatmaps.sr})`),
		fc: max(sql<number>`if(${scores.MISS} = 0, floor(${beatmaps.sr}), null)`),
		rice: max(sql<number>`${beatmaps.sr} >= 4 and ${beatmaps.rice} > 0.9 * ${beatmaps.objects}`),
		ln: max(sql<number>`${beatmaps.sr} >= 4 and ${beatmaps.ln} > 0.5 * ${beatmaps.objects}`),
		combo727: max(sql<number>`${scores.maxCombo} = 727`),
		possessed: max(sql<number>`${scores.beatmapId} = ${POSSESSION_ID}
			and ${scores.score} >= ${PERFECT_SCORE}`),
	})
		.from(scores)
		.innerJoin(beatmaps, eq(beatmaps.id, scores.beatmapId))
		.where(eq(scores.characterId, characterId));
	// no scores yet: every aggregate is null
	return {
		pass: Number(row?.pass ?? 0),
		fc: Number(row?.fc ?? 0),
		rice: Number(row?.rice) > 0,
		ln: Number(row?.ln) > 0,
		combo727: Number(row?.combo727) > 0,
		possessed: Number(row?.possessed) > 0,
	};
};

const firstPlaces = async (characterId: number) => {
	const [row] = await db.select({ n: count() })
		.from(firstPlace)
		.where(eq(firstPlace.characterId, characterId));
	return row?.n ?? 0;
};

/** Most plays of any single map. */
const mostReplays = async (characterId: number) => {
	const [row] = await db.select({ n: max(beatmaps_played.plays) })
		.from(beatmaps_played)
		.where(eq(beatmaps_played.characterId, characterId));
	return Number(row?.n ?? 0);
};

/** How many maps the account proposed are now ranked. Adri also gets the ranked maps nobody proposed. */
const curatedQuery = (user: number | AnyMySqlColumn) => db.select({ n: count() })
	.from(beatmapset)
	.leftJoin(beatmapRequests, eq(beatmapRequests.setId, beatmapset.osuId))
	.where(and(
		or(
			eq(beatmapRequests.userId, user),
			and(
				isNull(beatmapRequests.setId),
				inArray(sql`${user}`, [...ADMIN_USER_IDS]),
			),
		),
		eq(beatmapset.status, 'ranked'),
		lte(beatmapset.rankedAt, new Date()),
	));

const curated = async (userId: number) => {
	const [row] = await curatedQuery(userId);
	return row?.n ?? 0;
};

/** The account rebirthed past this character (the old one keeps the medal too). */
const rebirthedPast = async (character: CharacterRow) => {
	const [row] = await db.select({ n: count() })
		.from(characters)
		.where(and(
			eq(characters.userId, character.userId),
			gt(characters.generation, character.generation),
		));
	return (row?.n ?? 0) > 0;
};

const localHour = (tz: string) => Number(new Intl.DateTimeFormat('en-US', {
	hour: 'numeric', hourCycle: 'h23', timeZone: tz,
}).format(new Date()));

/** Everything the medal conditions read, as it stands now. */
const live = async (character: CharacterRow, play: PlayFacts, tz?: string) => {
	const id = character.id;
	const [facts, firsts, replays, curatedMaps, totals, chatted, rebirthed] = await Promise.all([
		scoreFacts(id),
		firstPlaces(id),
		mostReplays(id),
		curated(character.userId),
		getCharacterTotals(id),
		hasChatted(id),
		rebirthedPast(character),
	]);
	return {
		...facts,
		character,
		totals,
		firsts,
		mostReplays: replays,
		curatedMaps,
		chatted,
		rebirthed: rebirthed || character.generation > 1,
		nightOwl: tz !== undefined && NIGHT_OWL_HOURS.includes(localHour(tz)),
		nearMiss: (play.failedAt ?? 0) >= FAIL_99,
		// raw, as the game shows it ("2.4ω")
		overdrive: Math.max(...Skills.map(s => character[`${s}Overdrive`])),
		prestige: Skills.reduce((sum, s) => sum + character[`${s}Prestige`], 0),
	};
};

type Live = Awaited<ReturnType<typeof live>>;

/** What each line of threshold medals counts, by medal id prefix. */
const COUNTERS: Record<string, (p: Live) => number> = {
	pass: p => p.pass,
	fc: p => p.fc,
	plays: p => p.totals.playCount,
	hits: p => p.totals.hits,
	time: p => p.totals.playTime / 3600,
	...Object.fromEntries(Skills.map(s => [s, (p: Live) => p.character[`${s}Level`]])),
	overall: p => p.character.overallLevel,
	upgrades: p => Skills.reduce((sum, s) => sum + p.character[`${s}Upgrades`], 0),
	ladders: p => Skills.filter(s =>
		p.character[`${s}Upgrades`] >= maxUpgrades(p.character[`${s}Prestige`])).length,
	overdrive: p => p.overdrive,
	prestige: p => p.prestige,
	first: p => p.firsts,
	pp: p => Number(p.character.pp),
	curator: p => p.curatedMaps,
};

/** Keep each counter's best ever next to where it is now, and return the
 *  bests: a reset or a loss never takes progress back, it has to be earned
 *  past again. */
const recordBest = async (characterId: number, p: Live): Promise<Record<string, number>> => {
	const stored = await db.select()
		.from(characterProgress)
		.where(eq(characterProgress.characterId, characterId));
	const before = new Map(stored.map(r => [r.line, r]));
	const changed = Object.entries(COUNTERS)
		.map(([line, value]) => {
			const current = value(p);
			return {
				characterId, line, current, value: Math.max(current, before.get(line)?.value ?? 0),
			};
		})
		.filter(r => r.current !== (before.get(r.line)?.current ?? 0));
	if (changed.length) await db.insert(characterProgress)
		.values(changed)
		.onDuplicateKeyUpdate({
			set: {
				value: sql`greatest(${characterProgress.value}, values(value))`,
				current: sql`values(current)`,
			},
		});
	const best: Record<string, number> = Object.fromEntries(stored.map(r => [r.line, r.value]));
	for (const r of changed) best[r.line] = r.value;
	return best;
};

/** Everything the medal conditions read, the counters at their best ever. */
const progress = async (character: CharacterRow, play: PlayFacts, tz?: string) => {
	const now = await live(character, play, tz);
	return {
		...now, best: await recordBest(character.id, now),
	};
};

type Progress = Awaited<ReturnType<typeof progress>>;
/** When a medal is earned, and the same in words for the admin page. */
type Rule = {
	test: (p: Progress) => boolean,
	rule: string,
	/** the counted value (its best) and its goal, for medals earned at a threshold */
	value?: (p: Progress) => number,
	current?: (p: Progress) => number,
	goal?: number,
};

const amount = (n: number) => n.toLocaleString('en-US');

/** A line of medals earned at thresholds of one counter's best. */
const series = (
	label: string,
	at: Record<string, number>,
	counter: string,
): Record<string, Rule> => Object.fromEntries(Object.entries(at).map(([id, min]) => [id, {
	test: (p: Progress) => (p.best[counter] ?? 0) >= min,
	rule: `best ${label} ≥ ${amount(min)}`,
	value: (p: Progress) => p.best[counter] ?? 0,
	current: (p: Progress) => COUNTERS[counter](p),
	goal: min,
}]));

const one = (rule: string, test: (p: Progress) => boolean): Rule => ({
	test, rule,
});

const STAR_STEPS = Array.from({ length: 10 }, (_, i) => i + 1);
const SKILL_STEPS = [50, 100, 105, 110];

/** When each medal is earned, by id. */
const RULES: Record<string, Rule> = {
	...series('best star rating (floored) among stored scores',
		Object.fromEntries(STAR_STEPS.map(n => [`pass-${n}`, n])), 'pass'),
	...series('best star rating (floored) among stored scores with 0 misses',
		Object.fromEntries(STAR_STEPS.map(n => [`fc-${n}`, n])), 'fc'),
	'grade-ss': one('holds an SS, X or XX', p => p.totals.SS + p.totals.X + p.totals.XX > 0),
	'grade-x': one('holds an X or XX', p => p.totals.X + p.totals.XX > 0),
	'grade-xx': one('holds an XX', p => p.totals.XX > 0),
	'rice': one('a score on a 4★+ map whose single notes are over 90% of its objects', p => p.rice),
	'ln': one('a score on a 4★+ map whose long notes are over 50% of its objects', p => p.ln),
	...series('play count', {
		'plays-100': 100, 'plays-1k': 1_000, 'plays-5k': 5_000, 'plays-25k': 25_000, 'plays-100k': 100_000,
	}, 'plays'),
	...series('notes hit (non-miss)', {
		'hits-100k': 1e5, 'hits-1m': 1e6, 'hits-10m': 1e7, 'hits-50m': 5e7, 'hits-1b': 1e9,
	}, 'hits'),
	...series('hours played (sum of map lengths)', {
		'time-10h': 10, 'time-100h': 100, 'time-1000h': 1_000, 'time-10000h': 10_000,
	}, 'time'),
	...Object.fromEntries(Skills.flatMap(skill => Object.entries(series(
		`${skill} level (earned)`,
		Object.fromEntries(SKILL_STEPS.map(n => [`${skill}-${n}`, n])),
		skill,
	)))),
	...series('overall level', {
		'overall-25': 25, 'overall-50': 50, 'overall-75': 75,
		'overall-100': 100, 'overall-105': 105, 'overall-110': 110,
	}, 'overall'),
	...series('upgrades held across all skills', {
		'upgrades-1': 1, 'upgrades-10': 10, 'upgrades-50': 50, 'upgrades-100': 100,
	}, 'upgrades'),
	...series('skills with every upgrade bought', {
		'ladders-1': 1, 'ladders-5': 5, 'ladders-10': 10, 'ladders-11': 11,
	}, 'ladders'),
	...series('highest raw overdrive on a skill (ω)', {
		'overdrive-2': 2, 'overdrive-10': 10, 'overdrive-100': 100, 'overdrive-1000': 1_000,
	}, 'overdrive'),
	...series('prestiges across all skills', {
		'prestige-1': 1, 'prestige-5': 5, 'prestige-25': 25, 'prestige-100': 100,
	}, 'prestige'),
	'rebirth': one('a reborn character, or one the account rebirthed past', p => p.rebirthed),
	...series('ranked maps currently held at #1', {
		'first-1': 1, 'first-10': 10, 'first-100': 100, 'first-1000': 1_000,
	}, 'first'),
	...series('pp', {
		'pp-1k': 1_000, 'pp-5k': 5_000, 'pp-10k': 10_000, 'pp-20k': 20_000,
	}, 'pp'),
	...series('proposed maps now ranked and live', {
		'curator-1': 1, 'curator-5': 5, 'curator-25': 25, 'curator-100': 100,
	}, 'curator'),
	'combo-727': one('a stored score with max combo exactly 727', p => p.combo727),
	'same-map-100': one('played a single map ≥ 100 times', p => p.mostReplays >= 100),
	'fail-99': one('the shown play failed after ≥ 99% of the map', p => p.nearMiss),
	'night-owl': one('the result is shown between 03:00 and 04:59 local time', p => p.nightOwl),
	'first-chat': one('has sent a #osu!idle chat message (counted since medals exist)', p => p.chatted),
	'possessed': one(`a ${amount(PERFECT_SCORE)} score on TAG underground - POSSESSION [CHALLENGE]`,
		p => p.possessed),
};

// a medal without a condition could never be earned: refuse to start
const unearnable = MEDALS.filter(m => !RULES[m.id]).map(m => m.id);
if (unearnable.length) throw new Error(`medals with no condition: ${unearnable.join(', ')}`);

/** Each medal's rule in words, for the admin page. */
export const medalRules = (): Record<string, string> =>
	Object.fromEntries(MEDALS.map(m => [m.id, RULES[m.id].rule]));

/** Every medal a character qualifies for right now, held or not. Reads only. */
export const earnedMedals = async (
	character: CharacterRow, play: PlayFacts = {}, tz?: string,
): Promise<string[]> => {
	const p = await progress(character, play, tz);
	return MEDALS.filter(m => RULES[m.id].test(p)).map(m => m.id);
};

/** How far a character is toward each threshold medal, at its best and now;
 *  secret ones stay secret. */
export const medalProgress = async (
	character: CharacterRow,
): Promise<Record<string, { value: number, current: number, goal: number }>> => {
	const p = await progress(character, {});
	return Object.fromEntries(MEDALS.flatMap(m => {
		const { value, current, goal } = RULES[m.id];
		return m.category !== 'secret' && value && current && goal !== undefined
			? [[m.id, {
				value: value(p), current: current(p), goal,
			}]]
			: [];
	}));
};

/**
 * Award a ranked play's medals, for a result screen about to show it (it asks
 * with `medals: true`). It also catches up on everything earned before and never
 * shown, which is how existing characters got their backfill.
 */
export const awardMedals = async (characterId: number, play: PlayFacts): Promise<MedalBatch> => {
	const character = await getCharacterById(characterId);
	if (!character) return {
		ids: [], held: 0,
	};
	const tz = await presenceTimezone(characterId);
	const batch = await addMedals(characterId, await earnedMedals(character, play, tz));
	if (batch.ids.length) await reindexCharacter(characterId);
	return batch;
};

/** Award what was earned away from a play (a first chat, a purchase) and show it
 *  on the character's devices right away. */
export const pushMedals = async (characterId: number): Promise<void> => {
	const character = await getCharacterById(characterId);
	if (!character) return;
	const medals = await addMedals(characterId, await earnedMedals(character));
	if (!medals.ids.length) return;
	await reindexCharacter(characterId);
	hub.sendTo(characterId, {
		type: 'medals', medals,
	});
};

/** How many characters hold each medal, out of every character that has played. */
export const medalHolders = async () => {
	const [held, [{ players }]] = await Promise.all([
		db.select({
			id: characterMedals.medalId, n: count(),
		})
			.from(characterMedals)
			.groupBy(sql`${characterMedals.medalId}`),
		db.select({ players: count() })
			.from(character_totals)
			.where(gt(character_totals.playCount, 0)),
	]);
	return {
		players, held: Object.fromEntries(held.map(h => [h.id, h.n])),
	};
};

/** XP multiplier from the medals a character holds. */
export const medalMultiplier = async (characterId: number): Promise<number> =>
	medalXPMultiplier((await getMedals(characterId)).map(m => m.medalId));

/** The medal lines with a progress board. A per-account line ranks each
 *  account's current character. */
const BOARDS: Record<string, { perAccount?: true }> = {
	hits: {},
	plays: {},
	time: {},
	first: {},
	upgrades: {},
	ladders: {},
	overdrive: {},
	curator: { perAccount: true },
};

export const ProgressLines = Object.keys(BOARDS);

/** A line's medals and the value each is earned at. */
const lineGoals = (line: string) => MEDALS.flatMap(m => {
	const { goal } = RULES[m.id];
	return m.id.startsWith(`${line}-`) && goal !== undefined
		? [{
			id: m.id, goal,
		}]
		: [];
});

/** Bring a character's best counters up to date. */
export const recordProgress = async (characterId: number) => {
	const character = await getCharacterById(characterId);
	if (character) await progress(character, {});
};

/** A set just went live, so its proposer's curator count rose (Adri's, if
 *  nobody proposed it). */
export const recordCurators = async (osuSetId: number | null) => {
	const [request] = osuSetId === null ? [] : await db.select({ userId: beatmapRequests.userId })
		.from(beatmapRequests)
		.where(eq(beatmapRequests.setId, osuSetId));
	const owners = await db.select({ id: users.currentCharacter })
		.from(users)
		.where(inArray(users.id, request ? [request.userId] : [...ADMIN_USER_IDS]));
	for (const { id } of owners) if (id) await recordProgress(id);
};

/** One medal line's board: the players furthest along it, with the line's goals.
 *  A value once reached stays, even if the live one drops. */
export const progressPage = async (
	line: string,
	page: number,
	size: number,
	country?: string,
	among?: number[],
) => {
	const { perAccount } = BOARDS[line];
	const rows = await db.select({
		id: characters.id,
		name: characters.name,
		country: users.country,
		value: characterProgress.value,
		current: characterProgress.current,
	})
		.from(characterProgress)
		.innerJoin(characters, eq(characters.id, characterProgress.characterId))
		.innerJoin(users, eq(users.id, characters.userId))
		.where(and(
			eq(characterProgress.line, line),
			gt(characterProgress.value, 0),
			perAccount && eq(characters.id, users.currentCharacter),
			country === undefined ? undefined : eq(users.country, country),
			among && inArray(characters.id, among.length ? among : [0]),
		))
		.orderBy(desc(characterProgress.value), characters.id)
		.limit(size)
		.offset((page - 1) * size);
	return {
		goals: lineGoals(line), rows,
	};
};

const PODIUM = 5;

/** Every medal line's top players, for the overview. */
export const progressOverview = () => Promise.all(ProgressLines.map(async line => ({
	line, ...await progressPage(line, 1, PODIUM),
})));
