import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
	and,
	asc,
	desc,
	eq,
	inArray,
	isNull,
	type SQL,
} from 'drizzle-orm';
import type { SkillName } from '@oss-idle/shared/skills';
import { batchIds } from '@oss-idle/shared/oauth';
import { db } from '../db/client';
import { users } from '../db/schema/user';
import {
	characters,
	resolveAvatarUrl,
} from '../db/schema/character';
import { getCharacterTotals } from '../db/schema/character_totals';
import {
	beatmapListColumns,
	beatmaps,
} from '../db/schema/beatmap';
import { beatmapset } from '../db/schema/beatmapset';
import { bestPPRows } from '../db/schema/best_pp';
import { firstPlaceRows } from '../db/schema/first_place';
import {
	recentScoreRows,
	toScoreDTO,
} from '../db/schema/score';
import { news } from '../db/schema/news';
import { liveDiffCondition } from '../beatmaps/catalog';
import {
	countryRank,
	globalRank,
	medalsPage,
	PAGE_SIZE,
	ppPage,
	scorePage,
} from '../rankings';
import {
	countryPage,
	skillRanking,
} from '../routes/ranking';
import { beatmapBoard } from '../routes/scores';
import { friendsOf } from '../social';
import { matchHistory } from '../matchHistory';
import { rateLimit } from '../rateLimit';
import {
	apiToken,
	needs,
} from '../oauth';
import {
	apiBeatmap,
	apiBeatmapset,
	apiNewsPost,
	apiScore,
	apiUser,
	statistics,
	userCompact,
	userStatistics,
} from './objects';

const idParam = z.coerce.number().int().positive();

const notFound = (what: string) => new HTTPException(404, { message: `${what} not found` });

const validated = <T extends z.ZodType>(schema: T) => zValidator('query', schema, r => {
	if (!r.success) throw r.error;
});

/** A visible account with the character a lookup lands on. */
const userWhere = async (where: SQL | undefined, on: SQL) => {
	const [row] = await db
		.select({
			user: users, character: characters,
		})
		.from(users)
		.innerJoin(characters, on)
		.where(and(where, isNull(users.restrictedAt)))
		.limit(1);
	if (!row) throw notFound('User');
	return row;
};

/** `{user}` is an account id, or `@name` (a current character's name). */
const byUser = (param: string) => {
	const name = param.startsWith('@') ? param.slice(1) : undefined;
	if (name === undefined && !/^\d+$/.test(param)) throw notFound('User');
	return userWhere(
		name === undefined ? eq(users.id, Number(param)) : eq(characters.name, name),
		eq(characters.id, users.currentCharacter),
	);
};

const byCharacter = (id: number) =>
	userWhere(eq(characters.id, id), eq(characters.userId, users.id));

const fullUser = async ({ user, character }: Awaited<ReturnType<typeof byCharacter>>) => {
	const [totals, global, country] = await Promise.all([
		getCharacterTotals(character.id),
		globalRank('pp', character.id),
		countryRank('pp', user.country, character.id),
	]);
	return apiUser(user, character, totals, {
		global, country,
	});
};

const listQuery = validated(z.object({
	limit: z.coerce.number().int().min(1).max(100).default(50),
	offset: z.coerce.number().int().min(0).default(0),
}));

type ScoreType = 'best' | 'firsts' | 'recent';

const characterScores = async (
	characterId: number,
	type: ScoreType,
	offset: number,
	limit: number,
) => {
	const rows = type === 'best'
		? (await bestPPRows(characterId, offset, limit)).map(r => ({
			...r, score: r.best_pp,
		}))
		: type === 'firsts'
			? (await firstPlaceRows(characterId, offset, limit)).map(r => ({
				...r, score: r.first_place,
			}))
			: await recentScoreRows(characterId, offset, limit);
	return rows.map(r => ({
		...apiScore(toScoreDTO(r.score)),
		beatmap: apiBeatmap(r.beatmap),
		beatmapset: apiBeatmapset(r.beatmapset),
	}));
};

/** A live difficulty, with its set. */
const beatmapWhere = async (where: SQL) => {
	const [row] = await db
		.select({
			beatmap: beatmapListColumns, set: beatmapset,
		})
		.from(beatmaps)
		.innerJoin(beatmapset, eq(beatmaps.setId, beatmapset.id))
		.where(and(where, liveDiffCondition))
		.limit(1);
	if (!row) throw notFound('Beatmap');
	return {
		...apiBeatmap(row.beatmap), beatmapset: apiBeatmapset(row.set),
	};
};

const scoreType = z.enum(['best', 'firsts', 'recent']);

const countryCode = z.string().length(2).toUpperCase().optional();

const boardQuery = validated(z.object({ country: countryCode }));

const rankingQuery = validated(z.object({
	country: countryCode,
	'cursor[page]': z.coerce.number().int().min(1).max(200).default(1),
}));

type Hydrated = Awaited<ReturnType<typeof ppPage>>[number];

const rankingEntry = (r: Hydrated, rank: number) => ({
	rank,
	...userStatistics(r.character, r.character_totals, {}),
	user: userCompact({
		userId: r.user.id,
		characterId: r.character.id,
		name: r.character.name,
		country: r.user.country,
		avatarUrl: resolveAvatarUrl(r.character.avatarUrl, r.user.avatarUrl),
	}),
});

/** osu!'s ranking page: 50 rows, and the cursor for the next page while there is one. */
const rankingPage = <T>(rows: T[], page: number) => ({
	ranking: rows,
	...rows.length === PAGE_SIZE && { cursor: { page: page + 1 } },
});

const rankOf = (page: number, i: number) => (page - 1) * PAGE_SIZE + i + 1;

export const apiV2Routes = new Hono()
	.use('*', rateLimit('api-v2', 1200))
	.use('*', apiToken)
	// osu!'s documented ceiling, per application
	.use('*', rateLimit('api-v2-client', 1200, c => String(c.get('token').clientId)))

	.get('/me', needs('identify'), async c => {
		const userId = c.get('token').userId;
		if (userId === undefined) throw new HTTPException(403, { message: 'This request needs a user token' });
		return c.json(await fullUser(await byUser(String(userId))));
	})

	.get('/friends', needs('friends.read'), async c => {
		const userId = c.get('token').userId;
		if (userId === undefined) throw new HTTPException(403, { message: 'This request needs a user token' });
		return c.json((await friendsOf(userId)).map(f => ({
			...userCompact({
				userId: f.userId,
				characterId: f.character.id,
				name: f.character.name,
				country: f.character.country,
				avatarUrl: f.character.avatarUrl,
			}),
			is_online: f.online,
			is_mutual: f.mutual,
		})));
	})

	.get('/users/:user', needs('public'), async c =>
		c.json(await fullUser(await byUser(c.req.param('user')))))

	.get('/users/:user/scores/:type', needs('public'), listQuery, async c => {
		const { character } = await byUser(c.req.param('user'));
		const { limit, offset } = c.req.valid('query');
		const type = scoreType.parse(c.req.param('type'));
		return c.json(await characterScores(character.id, type, offset, limit));
	})

	.get('/characters', needs('public'), async c => {
		const ids = batchIds.parse(c.req.queries('ids[]') ?? []);
		if (!ids.length) return c.json({ characters: [] });
		const rows = await db
			.select({
				user: users, character: characters,
			})
			.from(users)
			.innerJoin(characters, eq(characters.userId, users.id))
			.where(and(inArray(characters.id, ids), isNull(users.restrictedAt)));
		return c.json({ characters: await Promise.all(rows.map(fullUser)) });
	})

	.get('/characters/:id', needs('public'), async c =>
		c.json(await fullUser(await byCharacter(idParam.parse(c.req.param('id'))))))

	.get('/characters/:id/scores/:type', needs('public'), listQuery, async c => {
		const { character } = await byCharacter(idParam.parse(c.req.param('id')));
		const { limit, offset } = c.req.valid('query');
		const type = scoreType.parse(c.req.param('type'));
		return c.json(await characterScores(character.id, type, offset, limit));
	})

	.get('/beatmaps/lookup', needs('public'), validated(z.object({ osu_id: idParam })), async c => {
		return c.json(await beatmapWhere(eq(beatmaps.osuId, c.req.valid('query').osu_id)));
	})

	.get('/beatmaps/:id', needs('public'), async c =>
		c.json(await beatmapWhere(eq(beatmaps.id, idParam.parse(c.req.param('id'))))))

	.get('/beatmaps/:id/scores', needs('public'), boardQuery, async c => {
		const rows = await beatmapBoard(idParam.parse(c.req.param('id')), c.req.valid('query').country);
		return c.json({
			scores: rows.map(({ score, player }) => ({
				...apiScore(score),
				user: userCompact({
					userId: player.userId,
					characterId: player.id,
					name: player.name,
					country: player.country,
					avatarUrl: player.avatarUrl,
				}),
			})), 
		});
	})

	.get('/beatmapsets/:id', needs('public'), async c => {
		const rows = await db
			.select({
				set: beatmapset, beatmap: beatmapListColumns,
			})
			.from(beatmaps)
			.innerJoin(beatmapset, eq(beatmaps.setId, beatmapset.id))
			.where(and(eq(beatmapset.id, idParam.parse(c.req.param('id'))), liveDiffCondition))
			.orderBy(asc(beatmaps.sr));
		if (!rows.length) throw notFound('Beatmapset');
		return c.json(apiBeatmapset(rows[0].set, rows.map(r => r.beatmap)));
	})

	.get('/rankings/country', needs('public'), rankingQuery, async c => {
		const page = c.req.valid('query')['cursor[page]'];
		return c.json(rankingPage((await countryPage(page)).map((r, i) => ({
			rank: rankOf(page, i),
			code: r.country,
			active_users: r.players,
			play_count: r.playCount,
			ranked_score: r.rankedScore,
			performance: r.pp,
		})), page));
	})

	.get('/rankings/skill/:skill', needs('public'), rankingQuery, async c => {
		const { country, 'cursor[page]': page } = c.req.valid('query');
		const skill = c.req.param('skill');
		const rows = await skillRanking(skill, page, country);
		return c.json(rankingPage(rows.map((r, i) => ({
			...rankingEntry(r, rankOf(page, i)),
			skill: skill === 'overall'
				? { level: r.character.overallLevel }
				: {
					level: r.character[`${skill as SkillName}Level`],
					prestige: r.character[`${skill as SkillName}Prestige`],
				},
		})), page));
	})

	.get('/rankings/:type', needs('public'), rankingQuery, async c => {
		const { country, 'cursor[page]': page } = c.req.valid('query');
		const type = z.enum(['performance', 'score', 'medals']).safeParse(c.req.param('type'));
		if (!type.success) throw notFound('Ranking');
		if (type.data === 'medals') {
			return c.json(rankingPage((await medalsPage(page, country)).map((r, i) => ({
				...rankingEntry(r, rankOf(page, i)), medals: r.medals,
			})), page));
		}
		const rows = type.data === 'performance'
			? await ppPage(page, country)
			: await scorePage(page, country);
		return c.json(rankingPage(rows.map((r, i) => rankingEntry(r, rankOf(page, i))), page));
	})

	.get('/matches/:id', needs('public'), async c => {
		const match = await matchHistory(idParam.parse(c.req.param('id')), c.get('token').userId);
		if (!match) throw notFound('Match');
		const users = new Map<number, { character_id: number; username: string; country_code: string }>();
		const player = (p?: { id: number; name: string; country: string }) => {
			if (!p) return undefined;
			users.set(p.id, {
				character_id: p.id, username: p.name, country_code: p.country,
			});
			return p.id;
		};
		const events = match.events.map(e => ({
			id: e.id,
			type: e.type,
			timestamp: new Date(e.at).toISOString(),
			character_id: player(e.player),
			...e.game && {
				game: {
					beatmap_id: e.game.beatmap.id,
					start_time: new Date(e.game.startedAt).toISOString(),
					end_time: e.game.endedAt === undefined ? undefined : new Date(e.game.endedAt).toISOString(),
					scores: e.game.scores.map(s => ({
						character_id: player(s.player),
						score: s.score,
						accuracy: s.accuracy,
						max_combo: s.maxCombo,
						rank: s.grade,
						passed: !s.failed,
						statistics: statistics(s.judgements),
					})),
				}, 
			},
		}));
		return c.json({
			match: {
				id: match.id,
				name: match.name,
				start_time: new Date(match.createdAt).toISOString(),
				end_time: match.endedAt === undefined ? undefined : new Date(match.endedAt).toISOString(),
			},
			events,
			users: [...users.values()],
		});
	})

	.get('/news', needs('public'), listQuery, async c => {
		const { limit, offset } = c.req.valid('query');
		const rows = await db
			.select({
				post: news, author: users.username,
			})
			.from(news)
			.leftJoin(users, eq(users.id, news.authorId))
			.where(eq(news.published, true))
			.orderBy(desc(news.publishedAt))
			.offset(offset)
			.limit(limit);
		return c.json({ news_posts: rows.map(r => apiNewsPost(r.post, r.author ?? 'unknown')) });
	})

	.get('/news/:slug', needs('public'), async c => {
		const [row] = await db
			.select({
				post: news, author: users.username,
			})
			.from(news)
			.leftJoin(users, eq(users.id, news.authorId))
			.where(and(eq(news.slug, c.req.param('slug')), eq(news.published, true)))
			.limit(1);
		if (!row) throw notFound('News post');
		return c.json(apiNewsPost(row.post, row.author ?? 'unknown', true));
	});
