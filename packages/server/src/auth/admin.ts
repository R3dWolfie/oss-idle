import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import {
	type Group,
	isAdmin,
	isModerator,
} from '@oss-idle/shared/groups';
import { requireAuth } from './middleware';
import { groupsOf } from '../groups';

const requireGroups = (allowed: (groups: Group[]) => boolean) =>
	createMiddleware<{ Variables: { userId: number } }>(async (c, next) => {
		await requireAuth(c, async () => {
			if (!allowed(await groupsOf(c.get('userId')))) throw new HTTPException(403, { message: 'Forbidden' });
			await next();
		});
	});

/** A signed-in admin. */
export const requireAdmin = requireGroups(isAdmin);

/** A signed-in admin or GMT member: sanctions and reports. */
export const requireModerator = requireGroups(isModerator);
