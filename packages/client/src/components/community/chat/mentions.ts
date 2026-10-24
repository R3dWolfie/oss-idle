import Log, { POPUP_TYPE } from '@oss-idle/shared/helpers/log';
import { ANNOUNCE_CHANNEL } from '@oss-idle/shared/community/wire';
import Socket from '../../../online/socket';
import Auth from '../../../online/auth';
import Entities from '../../../entity/entities';
import { blocked } from '../../../online/blocks';
import { isCommunityOpen } from '../../../globals';
import { showChat } from '../state';
import { plainText } from './links';
import {
	activeChatTab,
	chatTabs,
} from './state';

/** The sender's name colour on a line that mentions you. */
export const MENTION_COLOR = '#66ccff';

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The text names the signed-in character, as a whole word. */
export const mentionsMe = (text: string): boolean => {
	if (!Auth.user.get()) return false;
	const name = Entities.character.get().name;
	return !!name && new RegExp(`(?<![\\w])${escape(name)}(?![\\w])`, 'i').test(text);
};

const openChannel = (channel: string): void => {
	void activeChatTab.set(channel);
	void isCommunityOpen.set(true);
	void showChat.set(true);
};

Socket.on('chat', ({ line }) => {
	if (line.kind !== 'player' || line.channel === ANNOUNCE_CHANNEL) return;
	if (line.from.userId === Auth.user.get()?.id || blocked.get().has(line.from.userId)) return;
	if (!chatTabs.get().includes(line.channel) || !mentionsMe(line.text)) return;
	if (isCommunityOpen.get() && showChat.get() && activeChatTab.get() === line.channel) return;
	Log.popup(
		`${line.from.name}: ${plainText(line.text)}`,
		POPUP_TYPE.chat,
		false,
		() => openChannel(line.channel),
	);
});
