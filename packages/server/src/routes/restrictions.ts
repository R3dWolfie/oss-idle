import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { isAdmin } from '@oss-idle/shared/groups';
import { requireModerator } from '../auth/admin';
import { getUserById } from '../db/schema/user';
import { groupsOf } from '../groups';
import {
	restrict,
	restrictedAccounts,
	silence,
	unrestrict,
	unsilence,
} from '../restrictions';

const idParam = z.coerce.number().int().positive();
const reason = z.string().trim().min(1).max(255);
const restrictBody = z.object({ reason });
// 0: until lifted
const silenceBody = z.object({
	reason, seconds: z.number().int().nonnegative(),
});

const json = <T extends z.ZodType>(schema: T) => zValidator('json', schema, r => {
	if (!r.success) throw r.error;
});

/** The account a sanction targets: it exists, and admins are out of reach. */
export const sanctionable = async (raw: string): Promise<number> => {
	const userId = idParam.parse(raw);
	if (!await getUserById(userId)) throw new HTTPException(404, { message: 'User not found' });
	if (isAdmin(await groupsOf(userId))) throw new HTTPException(403, { message: 'Admins can\'t be sanctioned' });
	return userId;
};

/** The moderators: restricted accounts, restricting, silencing and lifting either by hand. */
export const restrictionsRoutes = new Hono()
	.get('/', requireModerator, async c => c.json((await restrictedAccounts()).map(r => ({
		...r,
		at: r.at?.getTime(),
		characterId: r.characterId ?? undefined,
		name: r.name ?? undefined,
		reason: r.reason ?? undefined,
	}))))

	.put('/:userId', requireModerator, json(restrictBody), async c => {
		const userId = await sanctionable(c.req.param('userId'));
		await restrict(userId, c.req.valid('json').reason, c.get('userId'));
		return c.json({ ok: true });
	})

	.delete('/:userId', requireModerator, async c => {
		await unrestrict(idParam.parse(c.req.param('userId')));
		return c.json({ ok: true });
	})

	.put('/:userId/silence', requireModerator, json(silenceBody), async c => {
		const { reason, seconds } = c.req.valid('json');
		await silence(await sanctionable(c.req.param('userId')), seconds, reason, c.get('userId'));
		return c.json({ ok: true });
	})

	.delete('/:userId/silence', requireModerator, async c => {
		await unsilence(idParam.parse(c.req.param('userId')));
		return c.json({ ok: true });
	});
