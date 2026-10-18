import {
	boolean,
	datetime,
	int,
	mysqlTable,
	timestamp,
	varchar,
} from 'drizzle-orm/mysql-core';
import { users } from './user';

/** One paid supporter tag: a one-off checkout or one subscription invoice. */
export const supporterOrders = mysqlTable('supporter_order', {
	id: int().autoincrement().primaryKey(),
	// cleared when the account is deleted: the payment record stays, by law
	buyerId: int().references(() => users.id, { onDelete: 'set null' }),
	recipientId: int().references(() => users.id, { onDelete: 'set null' }),
	// euro cents
	amount: int().notNull(),
	months: int().notNull(),
	recurring: boolean().notNull(),
	// the checkout session (one-off) or invoice (subscription) it came from; a
	// webhook delivered twice grants once
	stripeRef: varchar({ length: 255 }).notNull().unique(),
	// the payment a refund points back to
	paymentIntent: varchar({ length: 255 }).unique(),
	// the stretch of tag this order bought; a refund cuts it from the end
	startsAt: datetime(),
	endsAt: datetime(),
	// euro cents refunded so far
	refunded: int().notNull().default(0),
	createdAt: timestamp().notNull().defaultNow(),
});
