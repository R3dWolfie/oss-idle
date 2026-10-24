import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import {
	and,
	asc,
	eq,
	isNull,
	like,
	sql,
} from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import {
	type CharacterRow,
	characters,
	getCharacterById,
	resolveAvatarUrl,
	resolveBannerUrl,
} from '../db/schema/character';
import {
	getUserById,
	supporterActive,
	users,
} from '../db/schema/user';
import { getCharacterTotals } from '../db/schema/character_totals';
import {
	bestSkillRank,
	countryRank,
	globalRank,
	ppTopPercent,
} from '../rankings';
import {
	getMostPlayed,
	getTotalPlayed,
} from '../db/schema/beatmaps_played';
import { getBestPP } from '../db/schema/best_pp';
import {
	getFirstPlaces,
	getNbFirstPlaces,
} from '../db/schema/first_place';
import { getRecentCharacterScores } from '../db/schema/score';
import { getFormerNames } from '../db/schema/name_history';
import { getMedals } from '../db/schema/character_medal';
import {
	medalHolders,
	medalProgress,
} from '../medals';
import { supportLevel } from '@oss-idle/shared/supporter';
import { profileOrder } from '@oss-idle/shared/profile';
import { userPageOf } from '../userPage';
import {
	groupsByUser,
	groupsOf,
} from '../groups';
import { createMiddleware } from 'hono/factory';
import { rollbackBody } from '@oss-idle/shared/upgrades';
import { requireAdmin } from '../auth/admin';
import { performUpgradeRevert } from '../character/actions';
import { pushCharacter } from '../character/push';
import { isPlaying } from '../play';
import { sessionUserId } from '../auth/middleware';
import { visibleTo } from '../restrictions';
import { likeEscape } from '../db/columns';
import {
	countCurated,
	getCurated,
} from '../beatmaps/curated';
import {
	countMapped,
	getMapped,
} from '../beatmaps/mapped';
import {
	idParam,
	valid,
} from '../validate';

const mappedStatus = z.enum(['ranked', 'unranked']);

type CharacterEnv = { Variables: { character: CharacterRow } };

/** Loads `:id`, hidden like its account when that is restricted. */
const loadCharacter = createMiddleware<CharacterEnv>(async (c, next) => {
	const character = await getCharacterById(idParam.parse(c.req.param('id')));
	const owner = character && await getUserById(character.userId);
	if (!character || (owner && !await visibleTo(owner, await sessionUserId(c)))) {
		throw new HTTPException(404, { message: 'Character not found' });
	}
	c.set('character', character);
	await next();
});

export const charactersRoutes = new Hono()
	// Players by name: the accounts' current characters, exact match first.
	.get('/search', async c => {
		const q = z.string().trim().min(1).max(32).safeParse(c.req.query('q'));
		if (!q.success) return c.json([]);
		const players = await db
			.select({
				userId: users.id,
				userAvatarUrl: users.avatarUrl,
				character: {
					id: characters.id,
					name: characters.name,
					avatarUrl: characters.avatarUrl,
				},
			})
			.from(users)
			.innerJoin(characters, eq(characters.id, users.currentCharacter))
			.where(and(isNull(users.restrictedAt), like(characters.name, `%${likeEscape(q.data)}%`)))
			.orderBy(sql`${characters.name} = ${q.data} desc`, asc(characters.name))
			.limit(50);
		const groups = await groupsByUser(players.map(p => p.userId));
		return c.json(players.map(({ userAvatarUrl, ...p }) => ({
			...p,
			character: {
				...p.character, avatarUrl: resolveAvatarUrl(p.character.avatarUrl, userAvatarUrl),
			},
			groups: groups.get(p.userId)!,
		})));
	})
	.use('/:id', loadCharacter)
	.use('/:id/*', loadCharacter)
	.get('/:id', async c => {
		const row = c.get('character');
		const user = await getUserById(row.userId);

		const formerNames = (await getFormerNames(row.id)).filter(n => n !== row.name);

		const { userPage, ...rest } = row;
		return c.json({
			...rest,
			userPage: await userPageOf(userPage),
			profileOrder: profileOrder(row.profileOrder ?? undefined),
			avatarUrl: resolveAvatarUrl(row.avatarUrl, user?.avatarUrl),
			bannerUrl: resolveBannerUrl(row.bannerUrl),
			formerNames,
			restricted: Boolean(user?.restrictedAt),
			groups: await groupsOf(row.userId),
			supportLevel: supportLevel(
				supporterActive(user),
				user?.supporterMonths ?? 0,
			),
		});
	})

	// The medals a character holds, newest first, and its progress toward the rest.
	.get('/:id/medals', async c => {
		const character = c.get('character');
		const [held, progress, holders] = await Promise.all([
			getMedals(character.id),
			medalProgress(character),
			medalHolders(),
		]);
		return c.json({
			held: held.map(m => ({
				id: m.medalId, unlockedAt: m.unlockedAt.getTime(),
			})),
			progress,
			holders,
		});
	})

	// Derived profile statistics: aggregates, grade/judgement totals and ranks.
	.get('/:id/stats', async c => {
		const character = c.get('character');
		const user = await getUserById(character.userId);
		const totals = await getCharacterTotals(character.id);

		const [globalRk, countryRk, scoreRk, overallRk, bestSkill, topPercent] = await Promise.all([
			globalRank('pp', character.id),
			countryRank('pp', user.country, character.id),
			globalRank('score', character.id),
			globalRank('overall', character.id),
			bestSkillRank(character.id),
			ppTopPercent(character.id),
		]);

		const stats = {
			pp: Number(character.pp),
			totalHits: totals.hits,
			globalRank: globalRk,
			/** the share of players with pp at or above this rank, 0..1 (osu!'s global_rank_percent) */
			globalRankPercent: topPercent === undefined ? undefined : topPercent / 100,
			rankHistory: character.rankHistory?.ranks ?? [],
			highestRanks: character.rankHistory?.highest ?? {},
			countryRank: countryRk,
			scoreRank: scoreRk,
			overallRank: overallRk,
			bestSkill,
			...totals,
		};

		return c.json(stats);
	})
	.get('/:id/mostplayed/:page', async c => {
		const { id } = c.get('character');
		const page = idParam.parse(c.req.param('page'));
		return c.json(await getMostPlayed(id, page));
	})
	.get('/:id/countplayed', async c => {
		const { id } = c.get('character');
		return c.json(await getTotalPlayed(id));
	})
	.get('/:id/bestpp/:page', async c => {
		const { id } = c.get('character');
		const page = idParam.parse(c.req.param('page'));
		return c.json(await getBestPP(id, page));
	})
	.get('/:id/countfirstplaces', async c => {
		const { id } = c.get('character');
		return c.json(await getNbFirstPlaces(id));
	})
	.get('/:id/firstplaces/:page', async c => {
		const { id } = c.get('character');
		const page = idParam.parse(c.req.param('page'));
		return c.json(await getFirstPlaces(id, page));
	})
	.get('/:id/recent/:page', async c => {
		const { id } = c.get('character');
		const page = idParam.parse(c.req.param('page'));
		return c.json(await getRecentCharacterScores(id, page));
	})
	// Ranked maps the character's account proposed.
	.get('/:id/countrankedmaps', async c => {
		const character = c.get('character');
		return c.json(await countCurated(character.userId));
	})
	.get('/:id/rankedmaps/:page', async c => {
		const character = c.get('character');
		const page = idParam.parse(c.req.param('page'));
		return c.json(await getCurated(character.userId, page));
	})
	// The account's own maps: ranked ones they mapped, or their unranked uploads.
	.get('/:id/countmapped/:status', async c => {
		const character = c.get('character');
		const status = mappedStatus.parse(c.req.param('status'));
		return c.json(await countMapped(character.userId, status));
	})
	.get('/:id/mapped/:status/:page', async c => {
		const character = c.get('character');
		const status = mappedStatus.parse(c.req.param('status'));
		const page = idParam.parse(c.req.param('page'));
		return c.json(await getMapped(character.userId, status, page));
	})
	// Admin: undo a skill's last upgrade - a misclick that bought one too many.
	.post('/:id/upgrade/rollback', requireAdmin, valid('json', rollbackBody), async c => {
		const { id } = c.get('character');
		if (await isPlaying(id)) throw new HTTPException(409, { message: 'A play is in progress' });
		const { skill, anchor } = c.req.valid('json');
		await performUpgradeRevert(id, skill, anchor);
		await pushCharacter(id);
		return c.json({ ok: true });
	})
;
