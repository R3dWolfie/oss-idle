import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { sessionUserId } from '../auth/middleware';
import { matchHistory } from '../matchHistory';

const idParam = z.coerce.number().int().positive();

export const matchesRoutes = new Hono()
	// a match's history: public, or for its players only
	.get('/:id', async c => {
		const history = await matchHistory(idParam.parse(c.req.param('id')), await sessionUserId(c));
		if (!history) throw new HTTPException(404, { message: 'Match not found' });
		return c.json(history);
	});
