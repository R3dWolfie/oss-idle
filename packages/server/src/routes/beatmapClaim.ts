import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import {
	and,
	asc,
	eq,
	isNull,
	isNotNull,
	ne,
} from 'drizzle-orm';
import { z } from 'zod';
import { INTRO_SET_ID } from '@osu-idle/shared/beatmap';
import { db } from '../db/client';
import {
	beatmapClaims,
	beatmapRequests,
	beatmapRequestVotes,
} from '../db/schema/beatmap_request';
import { beatmapset } from '../db/schema/beatmapset';
import { users } from '../db/schema/user';
import { requireAuth } from '../auth/middleware';
import { requireAdmin } from '../auth/admin';
import { liveCondition } from '../beatmaps/catalog';
import { pushMedals } from '../medals';

// ponytail: temporary, for maps proposed on Discord before the queue existed - drop with beatmap_claim once settled.

const idParam = z.coerce.number().int().positive();

const jsonBody = <T extends z.ZodType>(schema: T) =>
	zValidator('json', schema, result => { if (!result.success) throw result.error; });

/** Ranked osu! sets nobody proposed, so still counted for Adri. */
const unclaimedSets = () => db
	.select({
		setId: beatmapset.id,
		osuId: beatmapset.osuId,
		artist: beatmapset.artist,
		title: beatmapset.title,
		creator: beatmapset.creator,
	})
	.from(beatmapset)
	.leftJoin(beatmapRequests, eq(beatmapRequests.setId, beatmapset.osuId))
	.where(and(
		liveCondition,
		isNotNull(beatmapset.osuId),
		isNull(beatmapRequests.setId),
		ne(beatmapset.id, INTRO_SET_ID),
	))
	.orderBy(asc(beatmapset.artist), asc(beatmapset.title));

export const beatmapClaimRoutes = new Hono()
	.get('/', requireAuth, async c => {
		const [maps, mine] = await Promise.all([
			unclaimedSets(),
			db.select({ setId: beatmapClaims.setId })
				.from(beatmapClaims)
				.where(eq(beatmapClaims.userId, c.get('userId'))),
		]);
		return c.json({
			maps, mine: mine.map(row => row.setId),
		});
	})

	// The player's whole selection, replacing what they claimed before.
	.put('/', requireAuth, jsonBody(z.object({ setIds: z.array(idParam).max(1000) })), async c => {
		const userId = c.get('userId');
		const open = new Set((await unclaimedSets()).map(set => set.setId));
		const setIds = [...new Set(c.req.valid('json').setIds)].filter(id => open.has(id));
		await db.transaction(async tx => {
			await tx.delete(beatmapClaims).where(eq(beatmapClaims.userId, userId));
			if (setIds.length) await tx.insert(beatmapClaims).values(setIds.map(setId => ({
				setId, userId, 
			})));
		});
		return c.json({ setIds });
	})

	.get('/admin', requireAdmin, async c => c.json(await db
		.select({
			setId: beatmapClaims.setId,
			userId: beatmapClaims.userId,
			username: users.username,
			characterId: users.currentCharacter,
			createdAt: beatmapClaims.createdAt,
			osuId: beatmapset.osuId,
			artist: beatmapset.artist,
			title: beatmapset.title,
			creator: beatmapset.creator,
		})
		.from(beatmapClaims)
		.innerJoin(beatmapset, eq(beatmapset.id, beatmapClaims.setId))
		.leftJoin(users, eq(users.id, beatmapClaims.userId))
		.orderBy(asc(beatmapset.artist), asc(beatmapset.title), asc(beatmapClaims.createdAt))))

	// Attribute the set to this claimer, as if they had proposed it through the queue.
	.post('/:setId/:userId', requireAdmin, async c => {
		const setId = idParam.parse(c.req.param('setId'));
		const userId = idParam.parse(c.req.param('userId'));
		const [set] = await db
			.select({
				osuId: beatmapset.osuId, artist: beatmapset.artist, title: beatmapset.title, creator: beatmapset.creator,
			})
			.from(beatmapset)
			.where(eq(beatmapset.id, setId));
		if (!set?.osuId) throw new HTTPException(404, { message: 'No such osu! set' });
		const { osuId, ...meta } = set;

		// Requests are keyed by osu! set id; the claim by ours.
		await db.transaction(async tx => {
			await tx.insert(beatmapRequests).values({
				setId: osuId,
				userId,
				...meta,
				status: 'accepted',
				resolvedAt: new Date(),
				resolvedBy: c.get('userId'),
			});
			await tx.insert(beatmapRequestVotes).values({
				setId: osuId, userId,
			});
			await tx.delete(beatmapClaims).where(eq(beatmapClaims.setId, setId));
		});
		const [claimer] = await db.select({ characterId: users.currentCharacter })
			.from(users)
			.where(eq(users.id, userId));
		if (claimer?.characterId) await pushMedals(claimer.characterId);
		return c.json({ ok: true });
	})

	.delete('/:setId/:userId', requireAdmin, async c => {
		const setId = idParam.parse(c.req.param('setId'));
		const userId = idParam.parse(c.req.param('userId'));
		await db.delete(beatmapClaims)
			.where(and(eq(beatmapClaims.setId, setId), eq(beatmapClaims.userId, userId)));
		return c.json({ ok: true });
	});

