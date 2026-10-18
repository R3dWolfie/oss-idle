import { unlink } from 'node:fs/promises';
import {
	eq,
	inArray,
} from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { db } from './db/client';
import { users } from './db/schema/user';
import { characters } from './db/schema/character';
import { skins } from './db/schema/skin';
import { addons } from './db/schema/addon';
import { firstPlace } from './db/schema/first_place';
import {
	matchEvents,
	matchGameScores,
} from './db/schema/match';
import {
	beatmapClaims,
	beatmapRequests,
	beatmapRequestVotes,
} from './db/schema/beatmap_request';
import {
	UPLOAD_DIR,
	UPLOAD_ROUTE,
} from './uploads';
import { unindexCharacter } from './rankings';
import { recomputeFirstPlace } from './scores';
import {
	abortPlay,
	playState,
} from './play';
import { leave } from './ws/presence';
import { forgetChatUser } from './ws/chat';
import { needStripe } from './stripe';
import {
	env,
	isProd,
} from './env';

/** The files this account uploaded: avatars, banners, skin and addon icons. */
const uploadsOf = async (userId: number, characterIds: number[]): Promise<string[]> => {
	const rows = await Promise.all([
		db.select({
			a: characters.avatarUrl, b: characters.bannerUrl,
		}).from(characters).where(inArray(characters.id, characterIds)),
		db.select({ a: skins.icon }).from(skins).where(eq(skins.authorId, userId)),
		db.select({ a: addons.icon }).from(addons).where(eq(addons.authorId, userId)),
	]);
	return rows.flat()
		.flatMap(r => Object.values(r))
		.filter((url): url is string => typeof url === 'string' && url.startsWith(`${UPLOAD_ROUTE}/`))
		.map(url => `${UPLOAD_DIR}/${url.slice(UPLOAD_ROUTE.length + 1)}`);
};

/** Deleting the customer cancels its subscription. One Stripe doesn't know (a staging copy of
 *  prod's ids, or already gone) is nothing to delete. */
const deleteCustomer = async (customer: string): Promise<void> => {
	try {
		await needStripe().customers.del(customer);
	} catch (e) {
		if ((e as { code?: string }).code !== 'resource_missing') throw e;
	}
};

/** Stops what the account has running and takes it off every board. */
const takeOffline = async (characterIds: number[]): Promise<void> => {
	for (const id of characterIds) {
		const state = await playState(id);
		if (state.phase === 'active') await abortPlay(id, state.token);
		await leave(id);
		await unindexCharacter(id);
	}
};

/** The rows that point at the account without a foreign key, so the delete can't reach them. */
const forgetUnlinked = async (userId: number, characterIds: number[]): Promise<void> => {
	await db.delete(beatmapRequestVotes).where(eq(beatmapRequestVotes.userId, userId));
	await db.delete(beatmapClaims).where(eq(beatmapClaims.userId, userId));
	// the map proposal stays for the others who backed it, without its proposer
	await db.update(beatmapRequests).set({ userId: 0 }).where(eq(beatmapRequests.userId, userId));
	if (!characterIds.length) return;
	await db.delete(matchGameScores).where(inArray(matchGameScores.characterId, characterIds));
	await db.delete(matchEvents).where(inArray(matchEvents.characterId, characterIds));
};

/** Deletes an account for good (a GDPR request): its characters and everything under them,
 *  its uploads and its Stripe customer (which cancels a subscription). Payment records stay,
 *  without the account, as the law requires. Backups keep a copy for up to 6 months. */
export const deleteAccount = async (userId: number): Promise<void> => {
	const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
	if (!user) throw new HTTPException(404, { message: 'User not found' });
	const characterIds = (await db
		.select({ id: characters.id })
		.from(characters)
		.where(eq(characters.userId, userId))).map(c => c.id);

	await takeOffline(characterIds);
	const held = characterIds.length ? await db
		.select({ beatmapId: firstPlace.beatmapId })
		.from(firstPlace)
		.where(inArray(firstPlace.characterId, characterIds)) : [];
	const files = await uploadsOf(userId, characterIds);
	if (user.stripeCustomerId && env.STRIPE_SECRET_KEY) await deleteCustomer(user.stripeCustomerId);

	await forgetUnlinked(userId, characterIds);
	await forgetChatUser(userId, characterIds);
	await db.delete(users).where(eq(users.id, userId));

	for (const { beatmapId } of held) await recomputeFirstPlace(beatmapId);
	// staging shares prod's uploads folder: there, these are prod's files
	if (isProd) for (const file of files) await unlink(file).catch(() => undefined);
};
