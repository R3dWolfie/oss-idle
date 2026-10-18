import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAdmin } from '../auth/admin';
import { getUserById } from '../db/schema/user';
import {
	restrict,
	restrictedAccounts,
	unrestrict,
} from '../restrictions';

const idParam = z.coerce.number().int().positive();
const restrictBody = z.object({ reason: z.string().trim().min(1).max(255) });

/** Admin: restricted accounts, and restricting or lifting by hand. */
export const restrictionsRoutes = new Hono()
	.get('/', requireAdmin, async c => c.json((await restrictedAccounts()).map(r => ({
		...r,
		at: r.at?.getTime(),
		characterId: r.characterId ?? undefined,
		name: r.name ?? undefined,
		reason: r.reason ?? undefined,
	}))))

	.put('/:userId', requireAdmin, zValidator('json', restrictBody, r => {
		if (!r.success) throw r.error;
	}), async c => {
		const userId = idParam.parse(c.req.param('userId'));
		if (!await getUserById(userId)) throw new HTTPException(404, { message: 'User not found' });
		await restrict(userId, c.req.valid('json').reason);
		return c.json({ ok: true });
	})

	.delete('/:userId', requireAdmin, async c => {
		await unrestrict(idParam.parse(c.req.param('userId')));
		return c.json({ ok: true });
	});
