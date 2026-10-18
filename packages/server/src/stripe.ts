import Stripe from 'stripe';
import { HTTPException } from 'hono/http-exception';
import { env } from './env';

const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : undefined;

export const needStripe = (): Stripe => {
	if (!stripe) throw new HTTPException(503, { message: 'The store is not open yet' });
	return stripe;
};

export const idOf = (ref: string | { id: string } | null | undefined): string | undefined =>
	typeof ref === 'string' ? ref : ref?.id;

/** Stops whatever the customer still has renewing. */
export const cancelSubscriptions = async (customer: string): Promise<void> => {
	const s = needStripe();
	for await (const sub of s.subscriptions.list({ customer })) {
		if (sub.status !== 'incomplete_expired') await s.subscriptions.cancel(sub.id);
	}
};
