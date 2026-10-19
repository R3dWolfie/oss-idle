import {
	int,
	mysqlEnum,
	mysqlTable,
	text,
	timestamp,
} from 'drizzle-orm/mysql-core';
import { REPORT_REASON } from '@oss-idle/shared/social';
import { users } from './user';

/** A player reporting another from their profile or a chat line; resolved by an admin from
 *  the chat console. */
export const userReports = mysqlTable('user_report', {
	id: int().autoincrement().primaryKey(),
	userId: int().notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	targetId: int().notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	reason: mysqlEnum(REPORT_REASON).notNull(),
	comment: text().notNull(),
	/** the reported chat line's text, when a message was reported */
	message: text(),
	createdAt: timestamp().notNull().defaultNow(),
	resolvedAt: timestamp(),
	resolvedBy: int(),
});
