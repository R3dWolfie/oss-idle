import {
	and,
	count,
	eq,
	gt,
	lte,
	max,
	sql,
} from 'drizzle-orm';
import {
	MEDALS,
	medalXPMultiplier,
} from '@osu-idle/shared/achievements/catalogue';
import { Skills } from '@osu-idle/shared/skills';
import { db } from './db/client';
import { scores } from './db/schema/score';
import { beatmaps } from './db/schema/beatmap';
import { beatmapset } from './db/schema/beatmapset';
import { firstPlace } from './db/schema/first_place';
import { beatmaps_played } from './db/schema/beatmaps_played';
import { beatmapRequests } from './db/schema/beatmap_request';
import {
	characters,
	getCharacterById,
	type CharacterRow,
} from './db/schema/character';
import { getCharacterTotals } from './db/schema/character_totals';
import {
	addMedals,
	getMedals,
} from './db/schema/character_medal';
import { presenceTimezone } from './ws/presence';
import { hasChatted } from './ws/chat';
import { hub } from './ws/hub';
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

/** How many maps the account proposed are now ranked. */
const curated = async (userId: number) => {
	const [row] = await db.select({ n: count() })
		.from(beatmapRequests)
		.innerJoin(beatmapset, eq(beatmapset.id, beatmapRequests.setId))
		.where(and(
			eq(beatmapRequests.userId, userId),
			eq(beatmapset.status, 'ranked'),
			lte(beatmapset.rankedAt, new Date()),
		));
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

/** Everything the medal conditions read, gathered in one go. */
const progress = async (character: CharacterRow, play: PlayFacts, tz?: string) => {
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

type Progress = Awaited<ReturnType<typeof progress>>;
/** When a medal is earned, and the same in words for the admin page. */
type Rule = { test: (p: Progress) => boolean, rule: string };

const amount = (n: number) => n.toLocaleString('en-US');

/** A line of medals earned at thresholds of one value. */
const series = (
	label: string,
	at: Record<string, number>,
	value: (p: Progress) => number,
): Record<string, Rule> => Object.fromEntries(Object.entries(at).map(([id, min]) => [id, {
	test: (p: Progress) => value(p) >= min,
	rule: `${label} ≥ ${amount(min)}`,
}]));

const one = (rule: string, test: (p: Progress) => boolean): Rule => ({
	test, rule,
});

const STAR_STEPS = Array.from({ length: 10 }, (_, i) => i + 1);
const SKILL_STEPS = [50, 100, 105, 110];

/** When each medal is earned, by id. */
const RULES: Record<string, Rule> = {
	...series('best star rating (floored) among stored scores',
		Object.fromEntries(STAR_STEPS.map(n => [`pass-${n}`, n])), p => p.pass),
	...series('best star rating (floored) among stored scores with 0 misses',
		Object.fromEntries(STAR_STEPS.map(n => [`fc-${n}`, n])), p => p.fc),
	'grade-ss': one('holds an SS, X or XX', p => p.totals.SS + p.totals.X + p.totals.XX > 0),
	'grade-x': one('holds an X or XX', p => p.totals.X + p.totals.XX > 0),
	'grade-xx': one('holds an XX', p => p.totals.XX > 0),
	'rice': one('a score on a 4★+ map whose single notes are over 90% of its objects', p => p.rice),
	'ln': one('a score on a 4★+ map whose long notes are over 50% of its objects', p => p.ln),
	...series('play count', {
		'plays-100': 100, 'plays-1k': 1_000, 'plays-5k': 5_000, 'plays-25k': 25_000, 'plays-100k': 100_000,
	}, p => p.totals.playCount),
	...series('notes hit (non-miss)', {
		'hits-100k': 1e5, 'hits-1m': 1e6, 'hits-10m': 1e7, 'hits-50m': 5e7, 'hits-1b': 1e9,
	}, p => p.totals.hits),
	...series('hours played (sum of map lengths)', {
		'time-10h': 10, 'time-100h': 100, 'time-1000h': 1_000, 'time-10000h': 10_000,
	}, p => p.totals.playTime / 3600),
	...Object.fromEntries(Skills.flatMap(skill => Object.entries(series(
		`${skill} level (earned)`,
		Object.fromEntries(SKILL_STEPS.map(n => [`${skill}-${n}`, n])),
		p => p.character[`${skill}Level`],
	)))),
	...series('overall level', {
		'overall-25': 25, 'overall-50': 50, 'overall-75': 75,
		'overall-100': 100, 'overall-105': 105, 'overall-110': 110,
	}, p => p.character.overallLevel),
	...series('upgrades bought, lifetime', {
		'upgrades-1': 1, 'upgrades-10': 10, 'upgrades-50': 50, 'upgrades-100': 100,
	}, p => p.character.upgradesBought),
	...series('upgrade ladders maxed out, lifetime', {
		'ladders-1': 1, 'ladders-5': 5, 'ladders-10': 10, 'ladders-15': 15,
	}, p => p.character.laddersCompleted),
	...series('highest raw overdrive on a skill (ω)', {
		'overdrive-2': 2, 'overdrive-10': 10, 'overdrive-100': 100, 'overdrive-1000': 1_000,
	}, p => p.overdrive),
	...series('prestiges across all skills', {
		'prestige-1': 1, 'prestige-5': 5, 'prestige-25': 25, 'prestige-100': 100,
	}, p => p.prestige),
	'rebirth': one('a reborn character, or one the account rebirthed past', p => p.rebirthed),
	...series('ranked maps currently held at #1', {
		'first-1': 1, 'first-10': 10, 'first-100': 100, 'first-1000': 1_000,
	}, p => p.firsts),
	...series('pp', {
		'pp-1k': 1_000, 'pp-5k': 5_000, 'pp-10k': 10_000, 'pp-20k': 20_000,
	}, p => Number(p.character.pp)),
	...series('proposed maps now ranked and live', {
		'curator-1': 1, 'curator-5': 5, 'curator-25': 25, 'curator-100': 100,
	}, p => p.curatedMaps),
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
	return addMedals(characterId, await earnedMedals(character, play, tz));
};

/** Award what was earned away from a play (a first chat, a purchase) and show it
 *  on the character's devices right away. */
export const pushMedals = async (characterId: number): Promise<void> => {
	const character = await getCharacterById(characterId);
	if (!character) return;
	const medals = await addMedals(characterId, await earnedMedals(character));
	if (medals.ids.length) hub.sendTo(characterId, {
		type: 'medals', medals,
	});
};

/** XP multiplier from the medals a character holds. */
export const medalMultiplier = async (characterId: number): Promise<number> =>
	medalXPMultiplier((await getMedals(characterId)).map(m => m.medalId));
