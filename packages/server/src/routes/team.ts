import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { GROUPS } from '@oss-idle/shared/groups';
import { requireAdmin } from '../auth/admin';
import { getUserById } from '../db/schema/user';
import {
	addToGroup,
	removeFromGroup,
	teamMembers,
} from '../groups';

const group = z.enum(GROUPS);
const userIdParam = z.coerce.number().int().positive();

/** Admin: the team's groups and their members. The owner is always an admin. */
export const teamRoutes = new Hono()
	.get('/', requireAdmin, async c => {
		const members = (await teamMembers()).map(m => ({
			...m,
			characterId: m.characterId ?? undefined,
			name: m.name ?? undefined,
			since: m.since.getTime(),
		}));
		return c.json({ members });
	})

	.put('/:group/:userId', requireAdmin, async c => {
		const userId = userIdParam.parse(c.req.param('userId'));
		if (!await getUserById(userId)) throw new HTTPException(404, { message: 'User not found' });
		await addToGroup(userId, group.parse(c.req.param('group')));
		return c.json({ ok: true });
	})

	.delete('/:group/:userId', requireAdmin, async c => {
		await removeFromGroup(userIdParam.parse(c.req.param('userId')), group.parse(c.req.param('group')));
		return c.json({ ok: true });
	});
