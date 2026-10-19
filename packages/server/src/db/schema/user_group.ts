import {
	int,
	mysqlEnum,
	mysqlTable,
	primaryKey,
	timestamp,
} from 'drizzle-orm/mysql-core';
import { GROUPS } from '@oss-idle/shared/groups';
import { users } from './user';

/** An account's membership of one group, set by an admin from the team page. */
export const userGroups = mysqlTable('user_group', {
	userId: int().notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	group: mysqlEnum(GROUPS).notNull(),
	createdAt: timestamp().notNull().defaultNow(),
}, table => [
	primaryKey({ columns: [table.userId, table.group] }),
]);
