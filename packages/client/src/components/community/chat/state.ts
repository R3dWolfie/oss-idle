import Synced from '@oss-idle/shared/helpers/synced';
import {
	ANNOUNCE_CHANNEL,
	DEFAULT_CHANNEL,
} from '@oss-idle/shared/community/wire';
import { LOGS_CHANNEL } from '../../../logs';

/** The open chat tabs: channels, plus one `pm:<userId>` tab per conversation. */
export const chatTabs = new Synced<string[]>([DEFAULT_CHANNEL, ANNOUNCE_CHANNEL, LOGS_CHANNEL]);
export const activeChatTab = new Synced<string | undefined>(DEFAULT_CHANNEL);
/** The channel list behind the tabs' + button. */
export const channelPickerOpen = new Synced(false);

const PM_PREFIX = 'pm:';
export const pmTab = (userId: number): string => `${PM_PREFIX}${userId}`;
/** The contact behind a conversation tab, or undefined for a channel. */
export const pmContact = (tab: string): number | undefined =>
	tab.startsWith(PM_PREFIX) ? Number(tab.slice(PM_PREFIX.length)) : undefined;
