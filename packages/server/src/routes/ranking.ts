import {
	Hono,
	type Context,
} from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { SkillName } from '@osu-idle/shared/skills';
import {
	desc,
	eq,
	gt,
	inArray,
	sql,
} from 'drizzle-orm';
import type { AnyMySqlColumn } from 'drizzle-orm/mysql-core';
import { db } from '../db/client';
import { sessionUserId } from '../auth/middleware';
import { friendCharacterIds } from '../social';
import {
	progressOverview,
	progressPage,
	ProgressLines,
} from '../medals';
import { characters } from '../db/schema/character';
import { character_totals } from '../db/schema/character_totals';
import { users } from '../db/schema/user';
import { bestPP } from '../db/schema/best_pp';
import {
	beatmapListColumns,
	beatmaps,
} from '../db/schema/beatmap';
import {
	gradesPage,
	medalsPage,
	PAGE_SIZE,
	playerCountries,
	ppPage,
	scorePage,
	skillPage,
} from '../rankings';
import {
	GOOD_GRADE,
	Judgements,
	type GoodGrade,
	type Judgement,
} from '@osu-idle/shared/judgement';

const idParam = z.coerce.number().int().positive();

const isValidSkill = (str: string): str is ('overall' | SkillName) => `${str}Level` in characters;

const skillRanking = (skill: string, page: number, country?: string, among?: number[]) => {
	if (!isValidSkill(skill)) throw new Error('Invalid parameters');
	return skillPage(skill, page, country, among);
};

const isValidGrade = (str: string): str is ('all' | GoodGrade) => 
	str === 'all' || str in GOOD_GRADE;

const gradesRanking = (grade: string, page: number, country?: string, among?: number[]) => {
	if (!isValidGrade(grade)) throw new Error('Invalid parameters');
	return gradesPage(grade, page, country, among);
};

/** The same skills, ranked on what they have ever earned rather than what they
 *  hold: `overall` is the summed column. */
const lifetimeRanking = (skill: string, page: number, country?: string, among?: number[]) => {
	if (!isValidSkill(skill)) throw new Error('Invalid parameters');
	return skillPage(`lifetime:${skill}`, page, country, among);
};

/** How many times each skill has been prestiged; `overall` is the total. */
const prestigeRanking = (skill: string, page: number, country?: string, among?: number[]) => {
	if (!isValidSkill(skill)) throw new Error('Invalid parameters');
	return skillPage(
		skill === 'overall' ? 'prestige:total' : `prestige:${skill}`, page, country, among,
	);
};

const total = (column: AnyMySqlColumn) => sql<number>`sum(${column})`.mapWith(Number);

/** Countries ranked on the summed pp of their players who have played ranked. */
const countryPage = (page: number) => db
	.select({
		country: users.country,
		players: sql<number>`count(*)`.mapWith(Number),
		playCount: total(character_totals.playCount),
		rankedScore: total(character_totals.rankedScore),
		pp: total(characters.pp),
		...Object.fromEntries(Judgements.map(j => [j, total(character_totals[j])])) as
			Record<Judgement, ReturnType<typeof total>>,
	})
	.from(characters)
	.innerJoin(character_totals, eq(character_totals.id, characters.id))
	.innerJoin(users, eq(users.id, characters.userId))
	.where(gt(character_totals.playCount, 0))
	.groupBy(users.country)
	.orderBy(desc(total(characters.pp)))
	.limit(PAGE_SIZE)
	.offset((page - 1) * PAGE_SIZE);

/** Every player's best pp plays, highest first. */
const topPlaysPage = (page: number, among?: number[]) => db
	.select({
		score: bestPP,
		beatmap: beatmapListColumns,
		character: {
			id: characters.id, name: characters.name, country: users.country,
		},
	})
	// left alone, the planner starts from the small character table and sorts
	.from(bestPP, { forceIndex: 'pp_idx' })
	.innerJoin(beatmaps, eq(beatmaps.id, bestPP.beatmapId))
	.innerJoin(characters, eq(characters.id, bestPP.characterId))
	.innerJoin(users, eq(users.id, characters.userId))
	.where(among && inArray(bestPP.characterId, among.length ? among : [0]))
	.orderBy(desc(bestPP.pp), desc(bestPP.id))
	.limit(PAGE_SIZE)
	.offset((page - 1) * PAGE_SIZE);

/** `?friends=1` narrows a board to the signed-in player and their friends. */
const friendsQuery = zValidator(
	'query',
	z.object({ friends: z.literal('1').optional() }),
	result => { if (!result.success) throw result.error; },
);

const amongFor = async (c: Context): Promise<number[] | undefined> => {
	if (c.req.query('friends') !== '1') return undefined;
	const viewer = await sessionUserId(c);
	return viewer === undefined ? [] : friendCharacterIds(viewer);
};

const progressQuery = zValidator(
	'query',
	z.object({
		friends: z.literal('1').optional(), country: z.string().optional(),
	}),
	result => { if (!result.success) throw result.error; },
);

export const rankingRoutes = new Hono()
	.get('/country/:page', async c => c.json(await countryPage(idParam.parse(c.req.param('page')))))
	.get('/plays/:page', friendsQuery, async c => c.json(
		await topPlaysPage(idParam.parse(c.req.param('page')), await amongFor(c)),
	))
	.get('/countries', async c => c.json(
		await playerCountries(),
	))
	.get('/global/:page', friendsQuery, async c => c.json(await ppPage(
		idParam.parse(c.req.param('page')),
		undefined,
		await amongFor(c),
	)))
	.get('/global/country/:country/:page', friendsQuery, async c => c.json(
		await ppPage(
			idParam.parse(c.req.param('page')), 
			c.req.param('country'),
			await amongFor(c)),
	))
	.get('/score/:page', friendsQuery, async c => c.json(
		await scorePage(idParam.parse(c.req.param('page')), undefined, await amongFor(c)),
	))
	.get('/score/country/:country/:page', friendsQuery, async c => c.json(
		await scorePage(
			idParam.parse(c.req.param('page')), 
			c.req.param('country'),
			await amongFor(c)),
	))
	.get('/medals/:page', friendsQuery, async c => c.json(
		await medalsPage(idParam.parse(c.req.param('page')), undefined, await amongFor(c)),
	))
	.get('/medals/country/:country/:page', friendsQuery, async c => c.json(
		await medalsPage(
			idParam.parse(c.req.param('page')),
			c.req.param('country'),
			await amongFor(c)),
	))
	.get('/progress', async c => c.json(await progressOverview()))
	.get('/progress/:line/:page', progressQuery, async c => {
		const line = z.enum(ProgressLines).parse(c.req.param('line'));
		return c.json(await progressPage(
			line,
			idParam.parse(c.req.param('page')),
			PAGE_SIZE,
			c.req.valid('query').country,
			await amongFor(c),
		));
	})
	.get('/skill/:skill/page/:page', friendsQuery, async c => c.json(
		await skillRanking(
			c.req.param('skill'), 
			idParam.parse(c.req.param('page')),
			undefined,
			await amongFor(c),
		)))
	.get('/skill/:skill/country/:country/page/:page', friendsQuery, async c => c.json(
		await skillRanking(
			c.req.param('skill'), 
			idParam.parse(c.req.param('page')), 
			c.req.param('country'),
			await amongFor(c),
		),
	))
	.get('/lifetime/:skill/page/:page', friendsQuery, async c => c.json(
		await lifetimeRanking(
			c.req.param('skill'),
			idParam.parse(c.req.param('page')),
			undefined,
			await amongFor(c),
		)))
	.get('/lifetime/:skill/country/:country/page/:page', friendsQuery, async c => c.json(
		await lifetimeRanking(
			c.req.param('skill'),
			idParam.parse(c.req.param('page')),
			c.req.param('country'),
			await amongFor(c),
		)))
	.get('/prestige/:skill/page/:page', friendsQuery, async c => c.json(
		await prestigeRanking(
			c.req.param('skill'),
			idParam.parse(c.req.param('page')),
			undefined,
			await amongFor(c),
		)))
	.get('/prestige/:skill/country/:country/page/:page', friendsQuery, async c => c.json(
		await prestigeRanking(
			c.req.param('skill'),
			idParam.parse(c.req.param('page')),
			c.req.param('country'),
			await amongFor(c),
		)))
	.get('/grades/:grade/page/:page', friendsQuery, async c => c.json(
		await gradesRanking(
			c.req.param('grade'), 
			idParam.parse(c.req.param('page')),
			undefined,
			await amongFor(c),
		)))
	.get('/grades/:grade/country/:country/page/:page', friendsQuery, async c => c.json(
		await gradesRanking(
			c.req.param('grade'), 
			idParam.parse(c.req.param('page')), 
			c.req.param('country'),
			await amongFor(c),
		),
	))
;
