import { z } from 'zod';

/** A line's reactions: an emoji's id (as text, a JSON key) → who reacted with it (user ids), in order. */
export const reactionsDTO = z.record(z.string(), z.array(z.number().int().positive()));
export type Reactions = z.infer<typeof reactionsDTO>;

/** Different emoji on one line at most; adding to one already there is always fine. */
export const MAX_REACTION_KINDS = 20;

/** `reactions` with `userId`'s `emojiId` on or off. `undefined` when nothing changes (already so, or a
 *  new emoji past the limit), so the caller can skip the write. An emoji nobody holds is dropped. */
export const applyReaction = (
	reactions: Reactions | undefined, emojiId: number, userId: number, on: boolean,
): Reactions | undefined => {
	const key = String(emojiId);
	const who = reactions?.[key] ?? [];
	if (on === who.includes(userId)) return undefined;
	const kinds = Object.keys(reactions ?? {}).length;
	if (on && !who.length && kinds >= MAX_REACTION_KINDS) return undefined;
	const next = { ...reactions };
	const now = on ? [...who, userId] : who.filter(id => id !== userId);
	if (now.length) next[key] = now;
	else delete next[key];
	return next;
};
