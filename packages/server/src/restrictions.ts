import type Stripe from 'stripe';
import {
	and,
	desc,
	eq,
	inArray,
	isNotNull,
	isNull,
} from 'drizzle-orm';
import { db } from './db/client';
import { users } from './db/schema/user';
import { characters } from './db/schema/character';
import { best } from './db/schema/best';
import { firstPlace } from './db/schema/first_place';
import { supporterOrders } from './db/schema/supporter_order';
import {
	reindexCharacterEverywhere,
	unindexCharacter,
} from './rankings';
import { recomputeFirstPlace } from './scores';
import {
	abortPlay,
	playState,
} from './play';
import { leave } from './ws/presence';
import {
	cancelSubscriptions,
	idOf,
} from './stripe';
import { accountHistory } from './db/schema/account_history';
import {
	moderationOf,
	setBanned,
	timeoutUser,
	untimeoutUser,
} from './ws/chat';
import type {
	Sanction,
	Standing,
} from '@oss-idle/shared/standing';
import { alias } from 'drizzle-orm/mysql-core';

const log = (userId: number, action: Sanction, reason: string, seconds: number, actorId: number) =>
	db.insert(accountHistory).values({
		userId, action, reason: reason.slice(0, 255), seconds, actorId,
	});

/** osu!'s silence: no chat or private messages for `seconds`, or until lifted with 0. */
export const silence = async (
	userId: number, seconds: number, reason: string, actorId: number,
): Promise<void> => {
	if (seconds) await timeoutUser(userId, seconds);
	else await setBanned(userId, true);
	await log(userId, 'silence', reason, seconds, actorId);
};

export const unsilence = async (userId: number): Promise<void> => {
	await untimeoutUser(userId);
	await setBanned(userId, false);
};

const characterIds = async (userId: number) => (await db
	.select({ id: characters.id })
	.from(characters)
	.where(eq(characters.userId, userId))).map(c => c.id);

/** osu!'s restricted mode: the account can't play or chat, and drops off every ranking,
 *  leaderboard, #1 and the online list until a moderator lifts it. `actorId` 0 is the server. */
export const restrict = async (userId: number, reason: string, actorId = 0): Promise<void> => {
	const [{ affectedRows }] = await db.update(users)
		.set({
			restrictedAt: new Date(), restrictedReason: reason.slice(0, 255),
		})
		.where(and(eq(users.id, userId), isNull(users.restrictedAt)));
	if (!affectedRows) return;
	await log(userId, 'restriction', reason, 0, actorId);

	const ids = await characterIds(userId);
	for (const id of ids) {
		const state = await playState(id);
		if (state.phase === 'active') await abortPlay(id, state.token);
		await leave(id);
		await unindexCharacter(id);
	}
	if (!ids.length) return;
	const held = await db
		.select({ beatmapId: firstPlace.beatmapId })
		.from(firstPlace)
		.where(inArray(firstPlace.characterId, ids));
	for (const { beatmapId } of held) await recomputeFirstPlace(beatmapId);
};

/** Puts the account back everywhere, its #1s included. */
export const unrestrict = async (userId: number): Promise<void> => {
	const [{ affectedRows }] = await db.update(users)
		.set({
			restrictedAt: null, restrictedReason: null,
		})
		.where(and(eq(users.id, userId), isNotNull(users.restrictedAt)));
	if (!affectedRows) return;

	const ids = await characterIds(userId);
	for (const id of ids) await reindexCharacterEverywhere(id);
	if (!ids.length) return;
	const maps = await db
		.selectDistinct({ beatmapId: best.beatmapId })
		.from(best)
		.where(inArray(best.characterId, ids));
	for (const { beatmapId } of maps) await recomputeFirstPlace(beatmapId);
};

const actor = alias(users, 'actor');
const actorCharacter = alias(characters, 'actor_character');

/** osu-web's Account Standing: the sanctions in force and every past one, newest first. The
 *  moderators' names are for the team only. */
export const standing = async (userId: number, withActors: boolean): Promise<Standing> => {
	const [user] = await db
		.select({ restrictedAt: users.restrictedAt })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);
	const chat = await moderationOf(userId);
	const rows = await db
		.select({
			id: accountHistory.id,
			action: accountHistory.action,
			reason: accountHistory.reason,
			seconds: accountHistory.seconds,
			at: accountHistory.createdAt,
			actor: actorCharacter.name,
		})
		.from(accountHistory)
		.leftJoin(actor, eq(actor.id, accountHistory.actorId))
		.leftJoin(actorCharacter, eq(actorCharacter.id, actor.currentCharacter))
		.where(eq(accountHistory.userId, userId))
		.orderBy(desc(accountHistory.createdAt), desc(accountHistory.id));
	return {
		silencedUntil: chat.timeoutUntil,
		silenced: chat.banned,
		restricted: Boolean(user?.restrictedAt),
		history: rows.map(({ at, actor, ...row }) => ({
			...row,
			at: at.getTime(),
			...withActors && actor ? { actor } : {},
		})),
	};
};

/** The restricted accounts, newest first, for the admin page. */
export const restrictedAccounts = () => db
	.select({
		userId: users.id,
		username: users.username,
		characterId: characters.id,
		name: characters.name,
		at: users.restrictedAt,
		reason: users.restrictedReason,
	})
	.from(users)
	.leftJoin(characters, eq(characters.id, users.currentCharacter))
	.where(isNotNull(users.restrictedAt))
	.orderBy(desc(users.restrictedAt));

/** A chargeback restricts the buyer, like osu! does, and stops their renewals. Lifting it is an
 *  admin's call. */
export const onDispute = async (dispute: Stripe.Dispute): Promise<void> => {
	const paymentIntent = idOf(dispute.payment_intent);
	if (!paymentIntent) return;
	const [order] = await db
		.select({
			id: supporterOrders.id, buyerId: supporterOrders.buyerId,
		})
		.from(supporterOrders)
		.where(eq(supporterOrders.paymentIntent, paymentIntent))
		.limit(1);
	// the payment's own event may still be on its way: fail, so Stripe delivers this again later
	if (!order) throw new Error(`dispute ${dispute.id}: no order for ${paymentIntent} yet`);
	// the buyer may have deleted their account since
	if (order.buyerId === null) return;
	await restrict(order.buyerId, `chargeback on order ${order.id}`);
	const [buyer] = await db
		.select({ customer: users.stripeCustomerId })
		.from(users)
		.where(eq(users.id, order.buyerId))
		.limit(1);
	if (buyer?.customer) await cancelSubscriptions(buyer.customer);
};
