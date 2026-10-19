import {
	compareGradeGT,
	type Grade,
	Grades,
	type Judgement,
	Judgements,
} from '@oss-idle/shared/judgement';
import {
	type AnyMySqlColumn,
	boolean,
	decimal,
	index,
	int,
	mysqlEnum,
	mysqlTable,
	primaryKey,
	timestamp,
} from 'drizzle-orm/mysql-core';
import { characters } from './character';
import type { ScoreDTO } from '@oss-idle/shared/score';
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

const judgeColumn = () => int().notNull().default(0);

type JudgeColumns = { [K in Judgement]: ReturnType<typeof judgeColumn> };

export const judgeColumns = Object.fromEntries(
	Judgements.map(judge => [judge, judgeColumn()]),
) as JudgeColumns;

export const scoreTableDefinition = {
	id: int().autoincrement().primaryKey(),
	characterId: int().notNull()
		.references(() => characters.id, { onDelete: 'cascade' }),
	// Plain id (no FK): imported scores can reference beatmaps not yet in the
	// server `beatmap` table.
	beatmapId: int().notNull(),
	score: int().notNull(),
	accuracy: decimal({
		precision: 10, scale: 5, 
	}).notNull(),
	maxCombo: int().notNull(),
	...judgeColumns,
	grade: mysqlEnum(Grades).notNull(),
	pp: decimal({
		precision: 10, scale: 3, 
	}).notNull(),
	ur: decimal({
		precision: 10, scale: 3, 
	}).notNull(),
	pfc: boolean().notNull(),
	playedAt: timestamp().defaultNow(),
	rate: decimal({
		precision: 3, scale: 2,
	}).notNull().default('1.00'),
	// the stars at that rate; null on plays from before rates
	sr: decimal({
		precision: 10, scale: 3,
	}),
};

type ScoreCols = { characterId: AnyMySqlColumn; beatmapId: AnyMySqlColumn };

// Shared across the score / best / best_pp tables (all built from
// scoreTableDefinition): index names are table-scoped in MySQL, so reuse is fine.
// `score` keeps a plain index - a character can have many plays per beatmap.
export const scoreIndexes = (table: ScoreCols & { playedAt: AnyMySqlColumn }) => [
	index('character_beatmap_idx').on(table.characterId, table.beatmapId),
	index('beatmap_idx').on(table.beatmapId),
	// Recent-scores feed: filter by character, read in playedAt order so the
	// LIMIT is served from the index instead of a filesort over every play.
	index('character_playedat_idx').on(table.characterId, table.playedAt),
];

export const scores = mysqlTable('score', scoreTableDefinition, scoreIndexes);

// `best` / `best_pp` hold at most one row per (character, beatmap), so that
// composite is their primary key. Their `id` is not autoincrement - it points
// at the winning row in `score`.
export const bestTableDefinition = {
	...scoreTableDefinition,
	id: int().notNull().references(() => scores.id, { onDelete: 'cascade' }),
};

export const bestConstraints = (table: ScoreCols) => [
	primaryKey({ columns: [table.characterId, table.beatmapId] }),
	index('beatmap_idx').on(table.beatmapId),
];

export type ScoreRow = typeof scores.$inferSelect;
export type NewScoreRow = typeof scores.$inferInsert;

export function toScoreDTO(row: ScoreRow): ScoreDTO {
	const judgements = Object.fromEntries(
		Judgements.map(j => [j, row[j]]),
	) as ScoreDTO['judgements'];

	return {
		id: row.id,
		beatmapId: row.beatmapId,
		characterId: row.characterId,
		grade: row.grade,
		maxCombo: row.maxCombo,
		pfc: row.pfc,
		score: row.score,
		judgements,
		accuracy: parseFloat(row.accuracy),
		pp: parseFloat(row.pp),
		ur: parseFloat(row.ur),
		rate: parseFloat(row.rate),
		playedAt: row.playedAt ? row.playedAt.getTime() : 0,
	};
}

/** The best grade a character ever set on a map, at any rate: a slowed play's cut score
 *  never makes it the best, so the best row's grade can sit below it. */
export const bestGradeOn = async (
	characterId: number,
	beatmapId: number,
): Promise<Grade | undefined> => {
	const rows = await db
		.selectDistinct({ grade: scores.grade })
		.from(scores)
		.where(and(eq(scores.characterId, characterId), eq(scores.beatmapId, beatmapId)));
	return rows.reduce<Grade | undefined>(
		(top, { grade }) => (!top || compareGradeGT(grade, top) ? grade : top), undefined,
	);
};

export const getScoreById = async (id: number) => {
	const [row] = await db
		.select()
		.from(scores)
		.where(eq(scores.id, id))
		.limit(1);
	return row;
};

export const getCharacterScores = (characterId: number, beatmapId: number) => db
	.select()
	.from(scores)
	.where(
		and(
			eq(scores.characterId, characterId),
			eq(scores.beatmapId, beatmapId),
		));

export const getAllCharacterScores = (characterId: number) => db
	.select()
	.from(scores)
	.where(eq(scores.characterId, characterId));
	
export const recentScoreRows = (characterId: number, offset: number, limit: number) => db
	.select({
		score: scores, beatmap: beatmapListColumns, beatmapset,
	})
	.from(scores)
	.innerJoin(beatmaps, eq(beatmaps.id, scores.beatmapId))
	.innerJoin(beatmapset, eq(beatmapset.id, beatmaps.setId))
	.where(eq(scores.characterId, characterId))
	.orderBy(desc(scores.playedAt))
	.offset(offset)
	.limit(limit);

export const getRecentCharacterScores = (characterId: number, page: number = 1) =>
	profilePage(page, (offset, limit) => recentScoreRows(characterId, offset, limit));