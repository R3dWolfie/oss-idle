import { randomUUID } from 'node:crypto';
import {
	MAX_CHAT_LENGTH,
	type PrivateMessage,
} from '@osu-idle/shared/community/wire';
import { getUserById } from '../db/schema/user';
import {
	blockedEitherWay,
	follows,
} from '../social';
import { areOnline } from './presence';
import {
	isMuted,
	rateLimited,
} from './chat';
import { hub } from './hub';

/** Whether `to` takes this message: online, no block either way, and - if they
 *  only take messages from the people they added - `from` is one of them. */
const deliverable = async (fromUserId: number, to: number): Promise<number | undefined> => {
	const recipient = await getUserById(to);
	const characterId = recipient?.currentCharacter;
	if (!recipient || !characterId) return undefined;
	const [[online], blocked, accepted] = await Promise.all([
		areOnline([characterId]),
		blockedEitherWay(fromUserId, to),
		recipient.pmFromAnyone || follows(to, fromUserId),
	]);
	return online && !blocked && accepted ? characterId : undefined;
};

/**
 * Relay one private message. Nothing is stored. The sender always gets it back
 * as if delivered - an offline recipient, one who doesn't take their messages,
 * or a block all look the same from their side. Mute and the rate limit still
 * answer with an error, as public chat does.
 */
export const handlePm = async (
	from: PrivateMessage['from'],
	to: number,
	text: string,
): Promise<void> => {
	const trimmed = text.trim();
	if (!trimmed || to === from.userId) return;

	if (await isMuted(from.userId)) {
		hub.sendTo(from.characterId, {
			type: 'error', message: 'You cannot post to chat right now.',
		});
		return;
	}
	if (await rateLimited(from.characterId)) {
		hub.sendTo(from.characterId, {
			type: 'error', message: 'You are sending messages too fast.',
		});
		return;
	}

	const message: PrivateMessage = {
		id: randomUUID(),
		from,
		to,
		text: trimmed.slice(0, MAX_CHAT_LENGTH),
		at: Date.now(),
	};
	hub.sendTo(from.characterId, {
		type: 'pm', message,
	});
	const recipient = await deliverable(from.userId, to);
	if (recipient !== undefined) hub.sendTo(recipient, {
		type: 'pm', message,
	});
};
