import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import {
	users,
	toUserDTO,
} from '../db/schema/user';

import { isAdmin } from '@osu-idle/shared/admin';
import { sessionUserId } from '../auth/middleware';

const idParam = z.coerce.number().int().positive();

/**
 * Example feature route. Demonstrates the full path a request travels -
 * param validation (zod) → DB query (Drizzle) → shared DTO response - and the
 * convention future routes should follow.
 *
 * Defined as a single chained expression so Hono captures each route in the
 * exported type; that type flows to the client's typed RPC client.
 */
export const usersRoutes = new Hono()
	.get('/:id', async c => {
		const id = idParam.parse(c.req.param('id'));

		const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);

		const viewer = await sessionUserId(c);
		if (!row || (row.restrictedAt && viewer !== row.id && !isAdmin(viewer))) {
			throw new HTTPException(404, { message: 'User not found' });
		}

		return c.json(toUserDTO(row));
	});
