import {
	char,
	index,
	int,
	mysqlTable,
	text,
	timestamp,
	varchar,
} from 'drizzle-orm/mysql-core';
import { users } from './user';

/** A developer's application on the public API. */
export const oauthClients = mysqlTable('oauth_client', {
	id: int().autoincrement().primaryKey(),
	userId: int().notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: varchar({ length: 100 }).notNull(),
	// shown to its owner on demand, like osu!
	secret: varchar({ length: 64 }).notNull(),
	// the callback URLs, one per line
	redirect: text().notNull(),
	createdAt: timestamp().notNull().defaultNow(),
}, table => [
	index('oauth_client_user_idx').on(table.userId),
]);

/** A token handed to a client. Only the sha256 of the token and its refresh token is kept. */
export const oauthTokens = mysqlTable('oauth_token', {
	id: char({ length: 64 }).primaryKey(),
	refresh: char({ length: 64 }).unique(),
	clientId: int().notNull()
		.references(() => oauthClients.id, { onDelete: 'cascade' }),
	// absent for client credentials
	userId: int()
		.references(() => users.id, { onDelete: 'cascade' }),
	scopes: varchar({ length: 255 }).notNull(),
	expiresAt: timestamp().notNull(),
	refreshExpiresAt: timestamp(),
	createdAt: timestamp().notNull().defaultNow(),
}, table => [
	index('oauth_token_user_client_idx').on(table.userId, table.clientId),
	index('oauth_token_expires_idx').on(table.expiresAt),
]);

export type OAuthClientRow = typeof oauthClients.$inferSelect;
