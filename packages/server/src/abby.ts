import {
	and,
	eq,
	isNull,
	lt,
	sql,
} from 'drizzle-orm';
import { db } from './db/client';
import { supporterOrders } from './db/schema/supporter_order';
import {
	env,
	isProd,
	redisKeyPrefix,
} from './env';
import { redis } from './redis';
import { warn } from './discord/error';
import { needStripe } from './stripe';

// refunds land before an order is booked, so the entry is final
const SETTLE_DAYS = 14;
// Abby's legacy codes: prestation de services (BNC), carte bancaire
const SERVICE_DELIVERY = 2;
const CARD = 3;

type Order = typeof supporterOrders.$inferSelect;

/** What reached the bank, in euro cents: the payment less Stripe's fee and the refunds. */
const received = async (order: Order): Promise<number> => {
	if (!order.paymentIntent) throw new Error('no payment intent');
	const intent = await needStripe().paymentIntents.retrieve(
		order.paymentIntent,
		{ expand: ['latest_charge.balance_transaction'] },
	);
	const charge = intent.latest_charge;
	const tx = typeof charge === 'object' ? charge?.balance_transaction : undefined;
	if (typeof tx !== 'object' || !tx) throw new Error('no balance transaction');
	return tx.net - order.refunded;
};

const book = async (key: string, order: Order): Promise<string> => {
	// euro cents, like Abby
	const cents = await received(order);
	const res = await fetch('https://api.abby.fr/incomeBook', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			client: 'Client particulier',
			priceWithoutTax: cents,
			priceTotalTax: cents,
			vatAmount: 0,
			productType: SERVICE_DELIVERY,
			paymentMethodUsed: { value: CARD },
			paidAt: order.createdAt.toISOString(),
			reference: `oss!idle supporter #${order.id} (${order.paymentIntent ?? order.stripeRef})`,
		}),
	});
	if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
	const entry = await res.json() as { _id: string };
	return entry._id;
};

/** Books the supporter orders past their refund window in Abby's livre des recettes, net of
 *  Stripe's fee and refunds, dated on the payment. Prod only: staging's orders are Stripe test ones. */
export const sweepAbby = async (): Promise<void> => {
	const key = env.ABBY_API_KEY;
	if (!isProd || !key) return;
	const lock = `${redisKeyPrefix}abby:lock`;
	if (await redis.set(lock, '1', 'EX', 600, 'NX') !== 'OK') return;
	try {
		const due = await db
			.select()
			.from(supporterOrders)
			.where(and(
				isNull(supporterOrders.abbyId),
				lt(supporterOrders.refunded, supporterOrders.amount),
				lt(supporterOrders.createdAt, sql`NOW() - INTERVAL ${SETTLE_DAYS} DAY`),
			));
		for (const order of due) {
			const abbyId = await book(key, order).catch((e: Error) => {
				warn(`Abby: order ${order.id} not booked: ${e.message}`.slice(0, 256));
			});
			if (!abbyId) return;
			await db.update(supporterOrders).set({ abbyId }).where(eq(supporterOrders.id, order.id));
		}
	} finally {
		await redis.del(lock);
	}
};

/** A refund on an order Abby already has: its entry stays, the refund is entered by hand. */
export const warnLateRefund = (orderId: number, cents: number): void => {
	const euros = (cents / 100).toFixed(2);
	warn(`Abby: order ${orderId} refunded ${euros} € after booking: enter it in Abby`);
};
