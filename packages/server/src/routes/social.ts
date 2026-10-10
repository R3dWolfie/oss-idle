import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import {
	requireAuth,
	sessionUserId,
} from '../auth/middleware';
import { getUserById } from '../db/schema/user';
import {
	addFriend,
	block,
	blockedBy,
	friendsOf,
	report,
	reports,
	resolveReport,
	unblock,
	relation,
	removeFriend,
	setSocialSettings,
	socialSettings,
} from '../social';
import { zValidator } from '@hono/zod-validator';
import {
	reportBody,
	socialSettingsBody,
} from '@osu-idle/shared/social';
import { requireAdmin } from '../auth/admin';

const idParam = z.coerce.number().int().positive();

export const socialRoutes = new Hono()

	// The accounts you added. Private: only ever your own list.
	.get('/friends', requireAuth, async c => c.json(await friendsOf(c.get('userId'))))

	.put('/friends/:userId', requireAuth, async c => {
		const userId = c.get('userId');
		const targetId = idParam.parse(c.req.param('userId'));
		if (targetId === userId) throw new HTTPException(400, { message: 'You cannot add yourself' });
		if (!await getUserById(targetId)) throw new HTTPException(404, { message: 'User not found' });
		return c.json(await addFriend(userId, targetId));
	})

	.delete('/friends/:userId', requireAuth, async c => {
		await removeFriend(c.get('userId'), idParam.parse(c.req.param('userId')));
		return c.json({ ok: true });
	})

	.get('/blocks', requireAuth, async c => c.json(await blockedBy(c.get('userId'))))

	.put('/blocks/:userId', requireAuth, async c => {
		const userId = c.get('userId');
		const targetId = idParam.parse(c.req.param('userId'));
		if (targetId === userId) throw new HTTPException(400, { message: 'You cannot block yourself' });
		if (!await getUserById(targetId)) throw new HTTPException(404, { message: 'User not found' });
		await block(userId, targetId);
		return c.json({ ok: true });
	})

	.delete('/blocks/:userId', requireAuth, async c => {
		await unblock(c.get('userId'), idParam.parse(c.req.param('userId')));
		return c.json({ ok: true });
	})

	.post('/reports/:userId', requireAuth, zValidator('json', reportBody, r => {
		if (!r.success) throw r.error;
	}), async c => {
		const userId = c.get('userId');
		const targetId = idParam.parse(c.req.param('userId'));
		if (targetId === userId) throw new HTTPException(400, { message: 'You cannot report yourself' });
		if (!await getUserById(targetId)) throw new HTTPException(404, { message: 'User not found' });
		await report(userId, targetId, c.req.valid('json'));
		return c.json({ ok: true });
	})

	.get('/reports', requireAdmin, async c => c.json(await reports()))

	.put('/reports/:id/resolve', requireAdmin, async c => {
		await resolveReport(idParam.parse(c.req.param('id')), c.get('userId'));
		return c.json({ ok: true });
	})

	.get('/settings', requireAuth, async c => c.json(await socialSettings(c.get('userId'))))

	.put('/settings', requireAuth, zValidator('json', socialSettingsBody, r => {
		if (!r.success) throw r.error;
	}), async c => c.json(await setSocialSettings(c.get('userId'), c.req.valid('json'))))

	// What a profile shows: the follower count, plus the viewer's side when signed in.
	.get('/relation/:userId', async c => c.json(await relation(
		idParam.parse(c.req.param('userId')),
		await sessionUserId(c),
	)));
