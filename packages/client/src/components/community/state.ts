import Synced from '@osu-idle/shared/helpers/synced';
import {
	mapped,
	type ValueIn,
} from '@osu-idle/shared/helpers/mapped';
import type { PresenceEntry } from '@osu-idle/shared/community/presence';
import { Setting } from '../../db/settings';
import { isCommunityOpen } from '../../globals';
import {
	TAB,
	type Tab,
} from './tabs';

export const showUsers = new Synced(false);
export const showChat = new Synced(false);
export const showTicker = new Setting('community.showTicker', true);
export const autoHide = new Setting('community.autoHide', false);

/** How the roster is narrowed. `friends` = the accounts you added. */
export const FILTER = mapped(['all', 'friends', 'country']);
export type Filter = ValueIn<typeof FILTER>;

/** Transient view state, shared so the header and body stay in sync. */
export const activeTab = new Synced<Tab | undefined>(TAB.name);
export const activeFilter = new Synced<Filter>(FILTER.all);
export const searchQuery = new Synced('');
/** The player whose card was clicked: their interaction menu is open. */
export const menuFor = new Synced<PresenceEntry | undefined>(undefined);
void isCommunityOpen.sync(open => { if (!open) void menuFor.set(undefined); });

