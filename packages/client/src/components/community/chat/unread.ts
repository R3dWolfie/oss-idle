import Synced from '@osu-idle/shared/helpers/synced';
import { ANNOUNCE_CHANNEL } from '@osu-idle/shared/community/wire';
import Socket from '../../../online/socket';
import Auth from '../../../online/auth';
import { blocked } from '../../../online/blocks';
import { isCommunityOpen } from '../../../globals';
import { showChat } from '../state';
import { chatTabs } from './state';

/** Someone wrote while the chat was hidden: the chat button lights up. */
export const chatUnread = new Synced(false);

const hidden = (): boolean => !isCommunityOpen.get() || !showChat.get();

const received = (userId: number): void => {
	if (hidden() && userId !== Auth.user.get()?.id && !blocked.get().has(userId)) {
		void chatUnread.set(true);
	}
};

Socket.on('chat', ({ line }) => {
	if (line.kind !== 'player' || line.channel === ANNOUNCE_CHANNEL) return;
	if (chatTabs.get().includes(line.channel)) received(line.from.userId);
});
Socket.on('pm', ({ message }) => received(message.from.userId));

const seen = (): void => { if (!hidden()) void chatUnread.set(false); };
void isCommunityOpen.sync(seen);
void showChat.sync(seen);
