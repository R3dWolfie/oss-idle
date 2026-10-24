import {
	boolean,
	index,
	int,
	mysqlEnum,
	mysqlTable,
	text,
	timestamp,
} from 'drizzle-orm/mysql-core';
import { BEATMAP_STATUS } from '@oss-idle/shared/beatmap';
import { db } from '../client';
import { eq } from 'drizzle-orm';

export const beatmapset = mysqlTable('beatmapset', {
	id: int().primaryKey().autoincrement(),
	// osu!'s set id, when the map has one
	osuId: int().unique(),
	artist: text().notNull(),
	title: text().notNull(),
	creator: text().notNull(),
	// 'pending' = uploaded, not scheduled; 'ranked' = scheduled/live (live once
	// rankedAt has passed); 'rejected' = pulled from the nomination queue;
	// 'unranked' = a player's own upload.
	status: mysqlEnum(BEATMAP_STATUS).notNull().default('pending'),
	// The scheduled rank time. Null until scheduled; a set is live (downloadable,
	// listed) only when status='ranked' AND rankedAt <= now().
	rankedAt: timestamp(),
	// Set true by the rank sweep once the "now ranked" webhook has fired, so it
	// announces each map exactly once when its rankedAt passes.
	announced: boolean().notNull().default(false),
	// When the set entered the queue (uploaded / submitted). Drives the
	// nomination list's sort.
	submittedAt: timestamp().notNull().defaultNow(),
	// Deleted from the queue: rows kept so a re-upload gets the same ids back.
	deletedAt: timestamp(),
	// The player who made the set: the uploader of an `unranked` one (the only one who
	// can replace it), the mapper of one taken from osu!.
	ownerUserId: int(),
	// An unranked set's leaderboard, opened for good by a supporter uploading or playing it.
	leaderboard: boolean().notNull().default(false),
	// Why an admin sent a player's submission back.
	reviewNote: text(),
	// When the set was first uploaded (submittedAt moves when it enters the queue).
	createdAt: timestamp().notNull().defaultNow(),
	// When a player last uploaded it: set on the sets players manage - their uploads,
	// and a map from osu! its mapper took over - and on no other.
	uploadedAt: timestamp(),
	// Listed in everyone's song select; otherwise downloaded from the site first.
	bundled: boolean().notNull().default(false),
	// its tags were reviewed: off the nomination page's "to categorize" queue
	categorized: boolean().notNull().default(false),
}, table => [index('beatmapset_owner_idx').on(table.ownerUserId)]);

export type BeatmapsetRow = typeof beatmapset.$inferSelect;
export type NewBeatmapsetRow = typeof beatmapset.$inferInsert;


export const getBeatmapsetById = async (id: number) => {
	const [row] = await db
		.select()
		.from(beatmapset)
		.where(eq(beatmapset.id, id))
		.limit(1);
	return row;
};