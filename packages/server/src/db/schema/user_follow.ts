import {
	index,
	int,
	mysqlTable,
	primaryKey,
	timestamp,
} from 'drizzle-orm/mysql-core';
import { users } from './user';

/** One account adding another as a friend. One-way: both rows = mutual. */
export const userFollows = mysqlTable('user_follow', {
	userId: int().notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	targetId: int().notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	createdAt: timestamp().notNull().defaultNow(),
}, table => [
	primaryKey({ columns: [table.userId, table.targetId] }),
	index('user_follow_target_idx').on(table.targetId, table.userId),
]);
