import { t } from '@lingui/core/macro';

import {
	ANNOUNCE_CHANNEL,
	type ChatLine,
} from '@oss-idle/shared/community/wire';
import Log, { POPUP_TYPE } from '@oss-idle/shared/helpers/log';

import { playPing } from '../../../audio/ping';
import { Setting } from '../../../db/settings';
import Entities from '../../../entity/entities';
import {
	isCommunityOpen,
	isStandalone,
} from '../../../globals';
import Auth from '../../../online/auth';
import { blocked } from '../../../online/blocks';
import Socket from '../../../online/socket';
import { showChat } from '../state';
import { plainText } from './links';
import {
	activeChatTab,
	chatTabs,
} from './state';

/** A mention you can't see plays a ping. */
export const mentionSound = new Setting('chat.mentionSound', true);
/** A mention while the game isn't in front shows a desktop notification. Off on the web until ticked,
 *  the click that asks the browser. */
export const mentionNotify = new Setting('chat.mentionNotify', isStandalone.get());

/** Whether notifications may show; the browser asks once, on a click. */
export const askNotifyPermission = async (): Promise<boolean> => {
	if (typeof Notification === 'undefined') return false;
	if (Notification.permission === 'default') await Notification.requestPermission();
	return Notification.permission === 'granted';
};

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

/** The game is the window in front: not minimised, not behind another one. */
const inFront = (): boolean => !document.hidden && document.hasFocus();

/** On the desktop, outside the game: clicking it brings the game back on that channel. */
const notify = (name: string, text: string, channel: string, icon?: string): void => {
	if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
	try {
		const n = new Notification(t`${name} mentioned you`, {
			body: text, icon, tag: `mention:${channel}`,
		});
		n.onclick = () => {
			window.focus();
			openChannel(channel);
			n.close();
		};
	} catch {
		// a browser that only lets a service worker notify: the popup and ping still came
	}
};

/** A line that mentions you, from someone else (not blocked), in a channel you have open. */
const mentionsYou = (line: ChatLine): line is Extract<ChatLine, { kind: 'player' }> =>
	line.kind === 'player' && line.channel !== ANNOUNCE_CHANNEL
	&& line.from.userId !== Auth.user.get()?.id && !blocked.get().has(line.from.userId)
	&& chatTabs.get().includes(line.channel) && mentionsMe(line.text);

Socket.on('chat', ({ line }) => {
	if (!mentionsYou(line)) return;
	const watching = isCommunityOpen.get() && showChat.get() && activeChatTab.get() === line.channel;
	// reading that channel right now: you've seen it
	if (watching && inFront()) return;
	const text = plainText(line.text);
	if (mentionSound.get()) playPing();
	if (!inFront() && mentionNotify.get()) {
		const avatar = Socket.presence.get()?.find(p => p.userId === line.from.userId)?.avatarUrl;
		notify(line.from.name, text, line.channel, avatar);
	}
	if (watching) return;
	Log.popup(
		`${line.from.name}: ${text}`,
		POPUP_TYPE.chat,
		false,
		() => openChannel(line.channel),
	);
});
