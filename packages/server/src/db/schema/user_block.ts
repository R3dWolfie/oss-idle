import {
	int,
	mysqlTable,
	primaryKey,
	timestamp,
} from 'drizzle-orm/mysql-core';
import { users } from './user';

/** One account blocking another. Stops private messages, both ways; the
 *  blocked side is never told. */
export const userBlocks = mysqlTable('user_block', {
	userId: int().notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	targetId: int().notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	createdAt: timestamp().notNull().defaultNow(),
}, table => [
	primaryKey({ columns: [table.userId, table.targetId] }),
]);
