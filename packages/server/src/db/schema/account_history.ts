import {
	index,
	int,
	mysqlEnum,
	mysqlTable,
	timestamp,
	varchar,
} from 'drizzle-orm/mysql-core';
import { SANCTIONS } from '@oss-idle/shared/standing';
import { users } from './user';

/** osu-web's `user_account_history`: every silence and restriction, for the Account Standing. */
export const accountHistory = mysqlTable('user_account_history', {
	id: int().autoincrement().primaryKey(),
	userId: int().notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	action: mysqlEnum(SANCTIONS).notNull(),
	reason: varchar({ length: 255 }).notNull(),
	// 0: until lifted
	seconds: int().notNull().default(0),
	// the moderator; 0 for the server itself (a chargeback)
	actorId: int().notNull().default(0),
	createdAt: timestamp().notNull().defaultNow(),
}, table => [
	index('user_account_history_user_idx').on(table.userId, table.createdAt),
]);
