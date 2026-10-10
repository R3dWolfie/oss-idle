import {
	int,
	mysqlTable,
	primaryKey,
	timestamp,
	varchar,
} from 'drizzle-orm/mysql-core';
import {
	desc,
	eq,
} from 'drizzle-orm';
import { characters } from './character';
import { db } from '../client';
import type { MedalBatch } from '@osu-idle/shared/play';

/** The medals a character holds. Never removed: a medal stays earned even if
 *  what earned it is lost (a #1 taken back, a map unranked). */
export const characterMedals = mysqlTable('character_medal', {
	characterId: int().notNull()
		.references(() => characters.id, { onDelete: 'cascade' }),
	medalId: varchar({ length: 32 }).notNull(),
	unlockedAt: timestamp().notNull().defaultNow(),
}, table => [
	primaryKey({ columns: [table.characterId, table.medalId] }),
]);

/** Newest first. */
export const getMedals = async (characterId: number) => db
	.select()
	.from(characterMedals)
	.where(eq(characterMedals.characterId, characterId))
	.orderBy(desc(characterMedals.unlockedAt));

/** Store the medals among `ids` the character did not hold yet; returns those,
 *  and how many it holds now. */
export const addMedals = async (characterId: number, ids: string[]): Promise<MedalBatch> => {
	const held = new Set((await getMedals(characterId)).map(m => m.medalId));
	const fresh = ids.filter(id => !held.has(id));
	if (!fresh.length) return {
		ids: [], held: held.size,
	};
	// two workers racing to award the same medal: the primary key keeps one
	await db.insert(characterMedals)
		.ignore()
		.values(fresh.map(medalId => ({
			characterId, medalId,
		})));
	return {
		ids: fresh, held: held.size + fresh.length,
	};
};
