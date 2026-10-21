import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import {
	DEFAULT_CHANNEL,
	TEAM_CHANNEL,
} from '@oss-idle/shared/community/wire';
import { isAdmin } from '@oss-idle/shared/groups';
import { requireModerator } from '../auth/admin';
import { groupsOf } from '../groups';
import { silence } from '../restrictions';
import { sanctionable } from './restrictions';
import { db } from '../db/client';
import { characters } from '../db/schema/character';
import { users } from '../db/schema/user';
import {
	adminAnnounce,
	characterOwner,
	chatChannels,
	chatHistory,
	deleteByCharacter,
	deleteMessages,
	handleChat,
	type ModerationStatus,
	moderationOf,
	nameColor,
	setBanned,
	untimeoutUser,
} from '../ws/chat';

// Re-throw the ZodError so the app's onError returns the standard shape.
const jsonBody = <T extends z.ZodType>(schema: T) =>
	zValidator('json', schema, result => {
		if (!result.success) throw result.error;
	});

const characterId = z.number().int().positive();

const historyQuery = z.object({ channel: z.string().optional() });

const messageBody = z.object({
	channel: z.string(),
	text: z.string().min(1),
});

const reason = z.string().trim().max(255).default('');

/** One moderation action. Timeout / ban are silences (logged with their reason) and optionally
 *  delete the line that triggered them; delete / deleteDay clear messages directly. */
const moderateBody = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('timeout'),
		characterId,
		seconds: z.number().int().positive(),
		reason,
		channel: z.string().optional(),
		messageId: z.string().optional(),
	}),
	z.object({
		action: z.literal('untimeout'), characterId,
	}),
	z.object({
		action: z.literal('ban'),
		characterId,
		reason,
		channel: z.string().optional(),
		messageId: z.string().optional(),
	}),
	z.object({
		action: z.literal('unban'), characterId,
	}),
	z.object({
		action: z.literal('delete'),
		channel: z.string(),
		ids: z.array(z.string()).min(1),
	}),
	z.object({
		action: z.literal('deleteDay'), channel: z.string(), characterId,
	}),
]);

/** The signed-in admin's current character (to post as themselves). */
const adminCharacter = async (userId: number) => {
	const [row] = await db
		.select({
			id: characters.id, name: characters.name,
		})
		.from(characters)
		.innerJoin(users, eq(users.currentCharacter, characters.id))
		.where(eq(users.id, userId))
		.limit(1);
	return row;
};

/**
 * The admin chat console API: browse a channel's rolling-day history, post as
 * yourself (or `/announce`, admins only), and moderate (timeout / ban / delete). All gated by
 * `requireModerator`. Live game clients are updated over the socket by `../ws/chat`.
 */
export const chatRoutes = new Hono()
	.get('/history', requireModerator, zValidator('query', historyQuery, r => {
		if (!r.success) throw r.error;
	}), async c => {
		const channel = c.req.valid('query').channel ?? DEFAULT_CHANNEL;
		const messages = await chatHistory(channel);
		const senders = [...new Set(
			messages.flatMap(m => m.kind === 'player' ? [m.from.characterId] : []),
		)];
		const moderation: Record<number, ModerationStatus> = {};
		for (const cid of senders) {
			const userId = await characterOwner(cid);
			if (userId) moderation[cid] = await moderationOf(userId);
		}
		return c.json({
			channels: chatChannels(), channel, messages, moderation,
		});
	})
	.post('/message', requireModerator, jsonBody(messageBody), async c => {
		const { channel, text } = c.req.valid('json');
		const prefix = '/announce ';
		if (text.startsWith(prefix)) {
			if (!isAdmin(await groupsOf(c.get('userId')))) throw new HTTPException(403, { message: 'Forbidden' });
			// an announcement reaches everyone
			if (channel === TEAM_CHANNEL) throw new HTTPException(400, { message: 'Cannot announce in #team' });
			adminAnnounce(channel, text.slice(prefix.length).trim());
			return c.json({ ok: true });
		}
		const userId = c.get('userId');
		const character = await adminCharacter(userId);
		if (!character) throw new HTTPException(400, { message: 'No character to post as' });
		await handleChat({
			characterId: character.id, name: character.name, color: await nameColor(userId),
		}, userId, channel, text, { bypassRate: true });
		return c.json({ ok: true });
	})
	.post('/moderate', requireModerator, jsonBody(moderateBody), async c => {
		const body = c.req.valid('json');

		if (body.action === 'delete') {
			await deleteMessages(body.channel, body.ids);
			return c.json({ ok: true });
		}
		if (body.action === 'deleteDay') {
			await deleteByCharacter(body.channel, body.characterId);
			return c.json({ ok: true });
		}

		const owner = await characterOwner(body.characterId);
		if (!owner) throw new HTTPException(404, { message: 'Unknown character' });
		const userId = await sanctionable(String(owner));

		switch (body.action) {
			case 'timeout':
			case 'ban':
				await silence(userId, body.action === 'ban' ? 0 : body.seconds, body.reason, c.get('userId'));
				if (body.channel && body.messageId) await deleteMessages(body.channel, [body.messageId]);
				break;
			case 'untimeout':
				await untimeoutUser(userId);
				break;
			case 'unban':
				await setBanned(userId, false);
				break;
		}
		return c.json({ ok: true });
	})
;
