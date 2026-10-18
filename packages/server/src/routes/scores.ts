import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import {
	eq,
	and,
	desc,
	inArray,
	isNull,
} from 'drizzle-orm';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { betterScore } from '@osu-idle/shared/scoreOrder';
import { db } from '../db/client';
import {
	scores,
	toScoreDTO,
} from '../db/schema/score';
import {
	beatmapListColumns,
	beatmaps,
} from '../db/schema/beatmap';
import { beatmapset } from '../db/schema/beatmapset';
import { best } from '../db/schema/best';
import {
	characters,
	resolveAvatarUrl,
} from '../db/schema/character';
import { users } from '../db/schema/user';
import {
	requireAuth,
	sessionUserId,
} from '../auth/middleware';
import {
	beatmapPageIds,
	beatmapRank,
	PAGE_SIZE,
} from '../rankings';
import { friendCharacterIds } from '../social';

const idParam = z.coerce.number().int().positive();

/** The signed-in user's active character row, or undefined if not onboarded. */
async function currentCharacter(userId: number) {
	const [row] = await db
		.select()
		.from(characters)
		.innerJoin(users, eq(users.currentCharacter, characters.id))
		.where(eq(users.id, userId))
		.limit(1);
	return row?.character;
}

/** Hydrate ranked character ids into their `best` rows on a beatmap, in rank order. */
async function beatmapLeaderboard(beatmapId: number, page: number, country?: string) {
	const ids = await beatmapPageIds(beatmapId, page, country);
	if (ids.length === 0) return [];
	const rows = await db
		.select()
		.from(best)
		.where(and(eq(best.beatmapId, beatmapId), inArray(best.characterId, ids)));
	const byCharacter = new Map(rows.map(r => [r.characterId, r]));
	return ids.map(id => byCharacter.get(id)).filter((r): r is NonNullable<typeof r> => !!r);
}

/** The signed-in character's own best on this beatmap, with its rank (global or
 *  within a country) - shown below the leaderboard even when outside the top 50. */
async function myBeatmapScore(userId: number, beatmapId: number, country?: string) {
	const character = await currentCharacter(userId);
	if (!character) return null;

	const [row] = await db
		.select()
		.from(best)
		.where(and(eq(best.beatmapId, beatmapId), eq(best.characterId, character.id)))
		.limit(1);
	if (!row) return null;

	const rank = await beatmapRank(beatmapId, character.id, country);
	return {
		score: toScoreDTO(row), rank, 
	};
}

const boardQuery = zValidator('query', z.object({
	country: z.string().length(2).optional(),
	friends: z.literal('1').optional(),
}), r => {
	if (!r.success) throw r.error;
});

/** The bests of the viewer and their friends on a map, in rank order. */
async function friendsBests(beatmapId: number, among: number[]) {
	const rows = await db
		.select()
		.from(best)
		.where(and(eq(best.beatmapId, beatmapId), inArray(best.characterId, among.length ? among : [0])));
	return rows.sort((a, b) => betterScore(a, b) ? -1 : 1);
}

/** A map's leaderboard for its web page: each best with who set it. */
export async function beatmapBoard(beatmapId: number, country?: string, among?: number[]) {
	const rows = among
		? await friendsBests(beatmapId, among)
		: await beatmapLeaderboard(beatmapId, 1, country);
	const ids = rows.map(r => r.characterId);
	const players = ids.length ? await db
		.select({
			id: characters.id,
			userId: users.id,
			name: characters.name,
			country: users.country,
			avatarUrl: characters.avatarUrl,
			osuAvatarUrl: users.avatarUrl,
		})
		.from(characters)
		.innerJoin(users, eq(users.id, characters.userId))
		.where(and(inArray(characters.id, ids), isNull(users.restrictedAt))) : [];
	const byId = new Map(players.map(p => [p.id, p]));
	return rows.flatMap(row => {
		const p = byId.get(row.characterId);
		if (!p) return [];
		return [{
			score: toScoreDTO(row),
			player: {
				id: p.id,
				userId: p.userId,
				name: p.name,
				country: p.country,
				avatarUrl: resolveAvatarUrl(p.avatarUrl, p.osuAvatarUrl),
			},
		}];
	}).slice(0, PAGE_SIZE);
}

export const scoresRoutes = new Hono()
	// the web map page: global, one country, or the viewer's friends
	.get('/beatmap/:beatmap/board', boardQuery, async c => {
		const { country, friends } = c.req.valid('query');
		const viewer = friends ? await sessionUserId(c) : undefined;
		const among = viewer === undefined ? undefined : await friendCharacterIds(viewer);
		if (friends && !among) return c.json([]);
		return c.json(await beatmapBoard(idParam.parse(c.req.param('beatmap')), country, among));
	})
	// the web score page: the score with its map, player and rank on the map, like osu!'s
	.get('/:id/show', async c => {
		const id = idParam.parse(c.req.param('id'));
		const [row] = await db
			.select({
				score: scores,
				beatmap: beatmapListColumns,
				beatmapset,
				player: {
					id: characters.id,
					userId: users.id,
					name: characters.name,
					country: users.country,
					avatarUrl: characters.avatarUrl,
					osuAvatarUrl: users.avatarUrl,
				},
			})
			.from(scores)
			.innerJoin(beatmaps, eq(beatmaps.id, scores.beatmapId))
			.innerJoin(beatmapset, eq(beatmapset.id, beatmaps.setId))
			.innerJoin(characters, eq(characters.id, scores.characterId))
			.innerJoin(users, eq(users.id, characters.userId))
			.where(and(eq(scores.id, id), isNull(users.restrictedAt)))
			.limit(1);
		if (!row) throw new HTTPException(404, { message: 'Score not found' });

		// only the player's best on the map holds a rank
		const [isBest] = await db.select({ id: best.id }).from(best).where(eq(best.id, id)).limit(1);
		const { osuAvatarUrl, ...player } = row.player;
		return c.json({
			score: toScoreDTO(row.score),
			beatmap: row.beatmap,
			beatmapset: row.beatmapset,
			player: {
				...player, avatarUrl: resolveAvatarUrl(player.avatarUrl, osuAvatarUrl), 
			},
			rank: isBest ? await beatmapRank(row.score.beatmapId, row.score.characterId) : undefined,
		});
	})
	.get('/:id', async c => {
		const id = idParam.parse(c.req.param('id'));

		const [row] = await db.select().from(scores).where(eq(scores.id, id)).limit(1);

		if (!row) throw new HTTPException(404, { message: 'Score not found' });

		return c.json(row);
	})
	// a match player's latest score on the round's map, for the multiplayer ranking
	.get('/character/:character/beatmap/:beatmap/latest', async c => {
		const [row] = await db
			.select()
			.from(scores)
			.where(and(
				eq(scores.characterId, idParam.parse(c.req.param('character'))),
				eq(scores.beatmapId, idParam.parse(c.req.param('beatmap'))),
			))
			.orderBy(desc(scores.playedAt))
			.limit(1);
		if (!row) throw new HTTPException(404, { message: 'Score not found' });
		return c.json(toScoreDTO(row));
	})
	.get('/beatmap/:beatmap', async c => c.json((
		await beatmapLeaderboard(
			idParam.parse(c.req.param('beatmap')),
			1,
		)).map(toScoreDTO)))
	.get('/beatmap/:beatmap/country/:country', async c => c.json((
		await beatmapLeaderboard(
			idParam.parse(c.req.param('beatmap')), 
			1,
			c.req.param('country'),
		)).map(toScoreDTO)))
	.get('/beatmap/:beatmap/me', requireAuth, async c => c.json(
		await myBeatmapScore(
			c.get('userId'),
			idParam.parse(c.req.param('beatmap')),
		)))
	.get('/beatmap/:beatmap/country/:country/me', requireAuth, async c => c.json(
		await myBeatmapScore(
			c.get('userId'), 
			idParam.parse(c.req.param('beatmap')),
			c.req.param('country'),
		)));
