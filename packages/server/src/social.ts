import {
	and,
	count,
	desc,
	eq,
	or,
	sql,
	isNull,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { playerCards } from './playerCards';
import { db } from './db/client';
import {
	getUserById,
	users,
} from './db/schema/user';
import { characters } from './db/schema/character';
import { userFollows } from './db/schema/user_follow';
import { userBlocks } from './db/schema/user_block';
import type {
	ReportBody,
	SocialSettings,
} from '@oss-idle/shared/social';
import { userReports } from './db/schema/user_report';

/** Friends are per account: a rebirth or a character switch keeps them. Shown
 *  through each account's current character. */

const theirs = alias(userFollows, 'their_follow');

/** The accounts `userId` added, each with its current character. Private to
 *  `userId`. */
export const friendsOf = async (userId: number) => {
	const rows = await db
		.select({
			userId: users.id,
			country: users.country,
			lastActiveAt: users.lastActiveAt,
			userAvatarUrl: users.avatarUrl,
			mutual: sql<number>`${theirs.userId} is not null`.mapWith(Boolean),
			character: {
				id: characters.id,
				name: characters.name,
				avatarUrl: characters.avatarUrl,
			},
		})
		.from(userFollows)
		.innerJoin(users, eq(users.id, userFollows.targetId))
		.innerJoin(characters, eq(characters.id, users.currentCharacter))
		.leftJoin(theirs, and(
			eq(theirs.userId, userFollows.targetId),
			eq(theirs.targetId, userFollows.userId),
		))
		.where(and(eq(userFollows.userId, userId), isNull(users.restrictedAt)));

	const cards = await playerCards(rows);
	return cards.map((card, i) => ({
		...card, mutual: rows[i].mutual,
	}));
};

export const follows = async (userId: number, targetId: number): Promise<boolean> => {
	const [row] = await db
		.select({ userId: userFollows.userId })
		.from(userFollows)
		.where(and(eq(userFollows.userId, userId), eq(userFollows.targetId, targetId)))
		.limit(1);
	return !!row;
};

/** The current characters of `userId` and of everyone they added - what a
 *  friends-only leaderboard ranks. */
export const friendCharacterIds = async (userId: number): Promise<number[]> => {
	const [own, rows] = await Promise.all([
		getUserById(userId),
		db.select({ id: users.currentCharacter })
			.from(userFollows)
			.innerJoin(users, eq(users.id, userFollows.targetId))
			.where(eq(userFollows.userId, userId)),
	]);
	return [own?.currentCharacter, ...rows.map(r => r.id)]
		.filter((id): id is number => typeof id === 'number');
};

/** Add `targetId` as a friend of `userId`. Idempotent; says whether it is now mutual. */
export const addFriend = async (userId: number, targetId: number): Promise<{ mutual: boolean }> => {
	await db.insert(userFollows).ignore().values({
		userId, targetId,
	});
	return { mutual: await follows(targetId, userId) };
};

export const removeFriend = async (userId: number, targetId: number): Promise<void> => {
	await db.delete(userFollows)
		.where(and(eq(userFollows.userId, userId), eq(userFollows.targetId, targetId)));
};

export const followerCount = async (userId: number): Promise<number> => {
	const [row] = await db
		.select({ n: count() })
		.from(userFollows)
		.where(eq(userFollows.targetId, userId));
	return row?.n ?? 0;
};

/** What a profile shows about an account: its public follower count, and -
 *  for a signed-in viewer - whether the viewer added it and whether it's mutual. */
export const relation = async (targetId: number, viewerId?: number) => {
	const followers = await followerCount(targetId);
	if (viewerId === undefined || viewerId === targetId) return { followers };
	const [friend, back, blocked] = await Promise.all([
		follows(viewerId, targetId),
		follows(targetId, viewerId),
		blocks(viewerId, targetId),
	]);
	return {
		followers, friend, mutual: friend && back, blocked,
	};
};

export const block = async (userId: number, targetId: number): Promise<void> => {
	await db.insert(userBlocks).ignore().values({
		userId, targetId,
	});
};

export const unblock = async (userId: number, targetId: number): Promise<void> => {
	await db.delete(userBlocks)
		.where(and(eq(userBlocks.userId, userId), eq(userBlocks.targetId, targetId)));
};

/** The accounts `userId` blocked. Private to them. */
export const blockedBy = async (userId: number): Promise<number[]> =>
	(await db.select({ id: userBlocks.targetId })
		.from(userBlocks)
		.where(eq(userBlocks.userId, userId)))
		.map(r => r.id);

const blocks = async (userId: number, targetId: number): Promise<boolean> => {
	const [row] = await db
		.select({ userId: userBlocks.userId })
		.from(userBlocks)
		.where(and(eq(userBlocks.userId, userId), eq(userBlocks.targetId, targetId)))
		.limit(1);
	return !!row;
};

export const report = async (
	userId: number,
	targetId: number,
	body: Omit<ReportBody, 'message'> & { message?: string },
): Promise<void> => {
	await db.insert(userReports).values({
		userId, targetId, ...body,
	});
};

const reporter = alias(users, 'reporter');
const reporterCharacter = alias(characters, 'reporter_character');

/** Open reports first, then the latest resolved ones - for the chat console. */
export const reports = async () => db
	.select({
		id: userReports.id,
		reason: userReports.reason,
		comment: userReports.comment,
		message: userReports.message,
		createdAt: userReports.createdAt,
		resolvedAt: userReports.resolvedAt,
		from: {
			userId: reporter.id, characterId: reporterCharacter.id, name: reporterCharacter.name,
		},
		target: {
			userId: users.id, characterId: characters.id, name: characters.name,
		},
	})
	.from(userReports)
	.innerJoin(users, eq(users.id, userReports.targetId))
	.innerJoin(characters, eq(characters.id, users.currentCharacter))
	.innerJoin(reporter, eq(reporter.id, userReports.userId))
	.innerJoin(reporterCharacter, eq(reporterCharacter.id, reporter.currentCharacter))
	.orderBy(sql`${userReports.resolvedAt} is not null`, desc(userReports.createdAt))
	.limit(100);

export const resolveReport = async (id: number, adminId: number): Promise<void> => {
	await db.update(userReports)
		.set({
			resolvedAt: new Date(), resolvedBy: adminId,
		})
		.where(eq(userReports.id, id));
};

/** Has either account blocked the other? */
export const blockedEitherWay = async (a: number, b: number): Promise<boolean> => {
	const [row] = await db
		.select({ userId: userBlocks.userId })
		.from(userBlocks)
		.where(or(
			and(eq(userBlocks.userId, a), eq(userBlocks.targetId, b)),
			and(eq(userBlocks.userId, b), eq(userBlocks.targetId, a)),
		))
		.limit(1);
	return !!row;
};

export const socialSettings = async (userId: number): Promise<SocialSettings> => {
	const user = await getUserById(userId);
	return { pmFromAnyone: user?.pmFromAnyone ?? true };
};

export const setSocialSettings = async (
	userId: number,
	settings: SocialSettings,
): Promise<SocialSettings> => {
	await db.update(users).set(settings).where(eq(users.id, userId));
	return settings;
};

/** Stamp the account as active now, for "Recently active". */
export const touchActive = async (userId: number): Promise<void> => {
	await db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, userId));
};
