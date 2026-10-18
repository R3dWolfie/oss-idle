import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAdmin } from '../auth/admin';
import { getUserById } from '../db/schema/user';
import { deleteAccount } from '../accounts';

const idParam = z.coerce.number().int().positive();
// the osu! username, typed again: a slip can't delete the wrong account
const deleteBody = z.object({ username: z.string() });

/** Admin: deleting an account for good, on the player's request. */
export const accountsRoutes = new Hono()
	.delete('/:userId', requireAdmin, zValidator('json', deleteBody, r => {
		if (!r.success) throw r.error;
	}), async c => {
		const userId = idParam.parse(c.req.param('userId'));
		const user = await getUserById(userId);
		if (!user) throw new HTTPException(404, { message: 'User not found' });
		if (user.username !== c.req.valid('json').username) {
			throw new HTTPException(400, { message: 'The username does not match' });
		}
		await deleteAccount(userId);
		return c.json({ ok: true });
	});
