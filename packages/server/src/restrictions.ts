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

const characterIds = async (userId: number) => (await db
	.select({ id: characters.id })
	.from(characters)
	.where(eq(characters.userId, userId))).map(c => c.id);

/** osu!'s restricted mode: the account can't play or chat, and drops off every ranking,
 *  leaderboard, #1 and the online list until an admin lifts it. */
export const restrict = async (userId: number, reason: string): Promise<void> => {
	const [{ affectedRows }] = await db.update(users)
		.set({
			restrictedAt: new Date(), restrictedReason: reason.slice(0, 255),
		})
		.where(and(eq(users.id, userId), isNull(users.restrictedAt)));
	if (!affectedRows) return;

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
