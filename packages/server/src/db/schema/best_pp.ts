import {
	index,
	mysqlTable,
} from 'drizzle-orm/mysql-core';
import {
	bestConstraints,
	bestTableDefinition,
	type ScoreRow,
} from './score';
import { db } from '../client';
import { profilePage } from '../profilePage';
import {
	eq,
	and,
	desc,
} from 'drizzle-orm';
import {
	beatmapListColumns,
	beatmaps,
} from './beatmap';
import { beatmapset } from './beatmapset';

export const bestPP = mysqlTable('best_pp', bestTableDefinition, table => [
	...bestConstraints(table),
	// top plays across everyone
	index('pp_idx').on(table.pp, table.id),
]);

export type BestPPScoreRow = typeof bestPP.$inferSelect;
export type NewBestPPScoreRow = typeof bestPP.$inferInsert;

export const getBestPPPlay = async (characterId: number, beatmapId: number) => {
	const [row] = await db
		.select()
		.from(bestPP)
		.where(
			and(
				eq(bestPP.characterId, characterId),
				eq(bestPP.beatmapId, beatmapId),
			))
		.limit(1);
	return row;
};

export const setNewBestPPPlay = async (score: ScoreRow) => db
	.insert(bestPP)
	.values(score)
	.onDuplicateKeyUpdate({ set: score });


export const bestPPRows = (characterId: number, offset: number, limit: number) => db
	.select({
		best_pp: bestPP, beatmap: beatmapListColumns, beatmapset,
	})
	.from(bestPP)
	.innerJoin(beatmaps, eq(beatmaps.id, bestPP.beatmapId))
	.innerJoin(beatmapset, eq(beatmapset.id, beatmaps.setId))
	.where(eq(bestPP.characterId, characterId))
	.orderBy(desc(bestPP.pp))
	.offset(offset)
	.limit(limit);

export const getBestPP = (characterId: number, page: number = 1) =>
	profilePage(page, (offset, limit) => bestPPRows(characterId, offset, limit));