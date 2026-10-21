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
	characters,
	getCharacterById,
	resolveAvatarUrl,
	resolveBannerUrl,
} from '../db/schema/character';
import {
	getUserById,
	users,
} from '../db/schema/user';
import { getCharacterTotals } from '../db/schema/character_totals';
import {
	bestSkillRank,
	countryRank,
	globalRank,
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
import { isModerator } from '@oss-idle/shared/groups';
import {
	groupsByUser,
	groupsOf,
} from '../groups';
import { createMiddleware } from 'hono/factory';
import { zValidator } from '@hono/zod-validator';
import { rollbackBody } from '@oss-idle/shared/upgrades';
import { requireAdmin } from '../auth/admin';
import { performUpgradeRevert } from '../character/actions';
import { pushCharacter } from '../character/push';
import { isPlaying } from '../play';
import { sessionUserId } from '../auth/middleware';
import {
	countCurated,
	getCurated,
} from '../beatmaps/curated';

const numberParam = z.coerce.number().int().positive();

/** A restricted account's characters exist only for their owner and the moderators. */
const hideRestricted = createMiddleware(async (c, next) => {
	const id = numberParam.safeParse(c.req.param('id'));
	if (id.success) {
		const character = await getCharacterById(id.data);
		const owner = character && await getUserById(character.userId);
		const viewer = await sessionUserId(c);
		if (owner?.restrictedAt && viewer !== owner.id && !isModerator(await groupsOf(viewer))) {
			throw new HTTPException(404, { message: 'Character not found' });
		}
	}
	await next();
});

const likeEscape = (s: string) => s.replace(/[\\%_]/g, c => `\\${c}`);

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
	.use('/:id', hideRestricted)
	.use('/:id/*', hideRestricted)
	.get('/:id', async c => {
		const id = numberParam.parse(c.req.param('id'));

		const [row] = await db.select().from(characters).where(eq(characters.id, id)).limit(1);

		if (!row) throw new HTTPException(404, { message: 'Character not found' });

		const user = await getUserById(row.userId);

		const formerNames = (await getFormerNames(id)).filter(n => n !== row.name);

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
				Boolean(user?.supporterUntil && user.supporterUntil > new Date()),
				user?.supporterMonths ?? 0,
			),
		});
	})

	// The medals a character holds, newest first, and its progress toward the rest.
	.get('/:id/medals', async c => {
		const id = numberParam.parse(c.req.param('id'));
		const character = await getCharacterById(id);
		if (!character) throw new HTTPException(404, { message: 'Character not found' });
		const [held, progress, holders] = await Promise.all([
			getMedals(id),
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
		const id = numberParam.parse(c.req.param('id'));

		const character = await getCharacterById(id);
		if (!character) throw new HTTPException(404, { message: 'Character not found' });

		const user = await getUserById(character.userId);
		const totals = await getCharacterTotals(character.id);

		const [globalRk, countryRk, scoreRk, overallRk, bestSkill] = await Promise.all([
			globalRank('pp', character.id),
			countryRank('pp', user.country, character.id),
			globalRank('score', character.id),
			globalRank('overall', character.id),
			bestSkillRank(character.id),
		]);

		const stats = {
			pp: Number(character.pp),
			totalHits: totals.hits,
			globalRank: globalRk,
			rankHistory: character.rankHistory?.ranks ?? [],
			countryRank: countryRk,
			scoreRank: scoreRk,
			overallRank: overallRk,
			bestSkill,
			...totals,
		};

		return c.json(stats);
	})
	.get('/:id/mostplayed/:page', async c => {
		const id = numberParam.parse(c.req.param('id'));
		const page = numberParam.parse(c.req.param('page'));

		const character = await getCharacterById(id);
		if (!character) throw new HTTPException(404, { message: 'Character not found' });

		return c.json(await getMostPlayed(id, page));
	})
	.get('/:id/countplayed', async c => {
		const id = numberParam.parse(c.req.param('id'));

		const character = await getCharacterById(id);
		if (!character) throw new HTTPException(404, { message: 'Character not found' });

		return c.json(await getTotalPlayed(id));
	})
	.get('/:id/bestpp/:page', async c => {
		const id = numberParam.parse(c.req.param('id'));
		const page = numberParam.parse(c.req.param('page'));

		const character = await getCharacterById(id);
		if (!character) throw new HTTPException(404, { message: 'Character not found' });

		return c.json(await getBestPP(id, page));
	})
	.get('/:id/countfirstplaces', async c => {
		const id = numberParam.parse(c.req.param('id'));

		const character = await getCharacterById(id);
		if (!character) throw new HTTPException(404, { message: 'Character not found' });

		return c.json(await getNbFirstPlaces(id));
	})
	.get('/:id/firstplaces/:page', async c => {
		const id = numberParam.parse(c.req.param('id'));
		const page = numberParam.parse(c.req.param('page'));

		const character = await getCharacterById(id);
		if (!character) throw new HTTPException(404, { message: 'Character not found' });

		return c.json(await getFirstPlaces(id, page));
	})
	.get('/:id/recent/:page', async c => {
		const id = numberParam.parse(c.req.param('id'));
		const page = numberParam.parse(c.req.param('page'));

		const character = await getCharacterById(id);
		if (!character) throw new HTTPException(404, { message: 'Character not found' });

		return c.json(await getRecentCharacterScores(id, page));
	})
	// Ranked maps the character's account proposed.
	.get('/:id/countrankedmaps', async c => {
		const id = numberParam.parse(c.req.param('id'));

		const character = await getCharacterById(id);
		if (!character) throw new HTTPException(404, { message: 'Character not found' });

		return c.json(await countCurated(character.userId));
	})
	.get('/:id/rankedmaps/:page', async c => {
		const id = numberParam.parse(c.req.param('id'));
		const page = numberParam.parse(c.req.param('page'));

		const character = await getCharacterById(id);
		if (!character) throw new HTTPException(404, { message: 'Character not found' });

		return c.json(await getCurated(character.userId, page));
	})
	// Admin: undo a skill's last upgrade - a misclick that bought one too many.
	.post('/:id/upgrade/rollback', requireAdmin, zValidator('json', rollbackBody, r => {
		if (!r.success) throw r.error;
	}), async c => {
		const id = numberParam.parse(c.req.param('id'));
		if (await isPlaying(id)) throw new HTTPException(409, { message: 'A play is in progress' });
		const { skill, anchor } = c.req.valid('json');
		await performUpgradeRevert(id, skill, anchor);
		await pushCharacter(id);
		return c.json({ ok: true });
	})
;
