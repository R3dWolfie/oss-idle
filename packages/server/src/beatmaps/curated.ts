import {
	and,
	countDistinct,
	desc,
	eq,
	getTableColumns,
	isNull,
	max,
	or,
	sum,
} from 'drizzle-orm';
import { isAdmin } from '@osu-idle/shared/admin';
import { db } from '../db/client';
import { beatmaps } from '../db/schema/beatmap';
import { beatmapset } from '../db/schema/beatmapset';
import { beatmapRequests } from '../db/schema/beatmap_request';
import { profilePage } from '../db/profilePage';
import { listedCondition } from './catalog';

/** Ranked sets the account proposed. Adri also gets the ranked maps nobody proposed. */
const curatedCondition = (userId: number) => and(
	listedCondition,
	isAdmin(userId)
		? or(eq(beatmapRequests.userId, userId), isNull(beatmapRequests.setId))
		: eq(beatmapRequests.userId, userId),
);

export const countCurated = async (userId: number) => {
	const [row] = await db.select({ n: countDistinct(beatmapset.id) })
		.from(beatmapset)
		.innerJoin(beatmaps, eq(beatmapset.id, beatmaps.setId))
		.leftJoin(beatmapRequests, eq(beatmapRequests.setId, beatmapset.osuId))
		.where(curatedCondition(userId));
	return row?.n ?? 0;
};

/** The account's ranked proposals, latest ranked first. */
export const getCurated = (userId: number, page: number) =>
	profilePage(page, (offset, limit) => db
		.select({
			...getTableColumns(beatmapset),
			plays: sum(beatmaps.plays),
			background: max(beatmaps.background),
		})
		.from(beatmapset)
		.innerJoin(beatmaps, eq(beatmapset.id, beatmaps.setId))
		.leftJoin(beatmapRequests, eq(beatmapRequests.setId, beatmapset.osuId))
		.where(curatedCondition(userId))
		.groupBy(beatmapset.id)
		.orderBy(desc(beatmapset.rankedAt), desc(beatmapset.id))
		.offset(offset)
		.limit(limit));
