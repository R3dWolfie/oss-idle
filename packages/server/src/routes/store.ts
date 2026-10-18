import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { checkoutBody } from '@osu-idle/shared/supporter';
import { requireAuth } from '../auth/middleware';
import { requireAdmin } from '../auth/admin';
import {
	adminOrders,
	checkout,
	findRecipient,
	handleWebhook,
	ordersOf,
	portal,
	refundUnused,
	supporterStatus,
} from '../supporter';

const recipientQuery = z.object({ name: z.string().trim().min(1) });
const idParam = z.coerce.number().int().positive();

export const storeRoutes = new Hono()

	.get('/me', requireAuth, async c => c.json(await supporterStatus(c.get('userId'))))

	.get('/orders', requireAuth, async c => c.json(await ordersOf(c.get('userId'))))

	.get('/recipient', requireAuth, zValidator('query', recipientQuery, r => {
		if (!r.success) throw r.error;
	}), async c => {
		const recipient = await findRecipient(c.req.valid('query').name);
		if (!recipient) throw new HTTPException(404, { message: 'Player not found' });
		return c.json(recipient);
	})

	.post('/checkout', requireAuth, zValidator('json', checkoutBody, r => {
		if (!r.success) throw r.error;
	}), async c => c.json({ url: await checkout(c.get('userId'), c.req.valid('json')) }))

	.post('/portal', requireAuth, async c => c.json({ url: await portal(c.get('userId')) }))

	.get('/admin/orders', requireAdmin, async c => c.json(await adminOrders()))

	// refunds the part of the tag not used yet; the webhook cuts the tag when Stripe confirms
	.post('/admin/orders/:id/refund', requireAdmin, async c =>
		c.json({ refunded: await refundUnused(idParam.parse(c.req.param('id'))) }))

	// Stripe calls this; the signature is the auth
	.post('/webhook', async c => {
		await handleWebhook(await c.req.text(), c.req.header('stripe-signature'));
		return c.json({ received: true });
	});
