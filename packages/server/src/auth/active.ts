import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema/user';
import { requireAuth } from './middleware';

type Env = { Variables: { userId: number } };

/** Require a session whose account still exists and isn't restricted: for what others see. */
export const requireActive = createMiddleware<Env>(async (c, next) => {
	await requireAuth(c, async () => {
		const [row] = await db
			.select({ restrictedAt: users.restrictedAt })
			.from(users)
			.where(eq(users.id, c.get('userId')))
			.limit(1);
		if (!row || row.restrictedAt) throw new HTTPException(403, { message: 'Your account is restricted' });
		await next();
	});
});
