import type Stripe from 'stripe';
import {
	and,
	eq,
	gte,
	ne,
	sql,
	type SQLWrapper,
} from 'drizzle-orm';
import { db } from './db/client';
import { users } from './db/schema/user';
import { supporterOrders } from './db/schema/supporter_order';
import { refundCut } from '@osu-idle/shared/supporter';
import { idOf } from './stripe';

/** A refund landed, from the admin page or the Stripe dashboard: the order loses its time from
 *  the end ({@link refundCut}), and the tags bought after it move back by as much. */
export const onRefund = async (charge: Stripe.Charge): Promise<void> => {
	const paymentIntent = idOf(charge.payment_intent);
	if (!paymentIntent) return;
	await db.transaction(async tx => {
		const [order] = await tx
			.select()
			.from(supporterOrders)
			.where(eq(supporterOrders.paymentIntent, paymentIntent))
			.for('update');
		if (!order?.startsAt || !order.endsAt) return;
		const delta = charge.amount_refunded - order.refunded;
		const refundable = order.amount - order.refunded;
		if (delta <= 0 || refundable <= 0) return;

		const share = Math.min(1, delta / refundable);
		const cut = Math.round(refundCut({
			startsAt: order.startsAt, endsAt: order.endsAt,
		}, share) / 1000);
		const months = Math.round(order.months * delta / order.amount);
		const back = (column: SQLWrapper) => sql`DATE_SUB(${column}, INTERVAL ${cut} SECOND)`;

		await tx.update(supporterOrders)
			.set({
				refunded: charge.amount_refunded, endsAt: back(supporterOrders.endsAt),
			})
			.where(eq(supporterOrders.id, order.id));
		// a deleted account has no tag left to cut
		const recipientId = order.recipientId;
		if (recipientId === null) return;
		await tx.update(supporterOrders)
			.set({
				startsAt: back(supporterOrders.startsAt), endsAt: back(supporterOrders.endsAt),
			})
			.where(and(
				eq(supporterOrders.recipientId, recipientId),
				ne(supporterOrders.id, order.id),
				gte(supporterOrders.startsAt, order.endsAt),
			));
		await tx.update(users)
			.set({
				supporterUntil: sql`DATE_SUB(${users.supporterUntil}, INTERVAL ${cut} SECOND)`,
				supporterMonths: sql`GREATEST(0, ${users.supporterMonths} - ${months})`,
			})
			.where(eq(users.id, recipientId));
	});
};
