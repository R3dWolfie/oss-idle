import Synced from '@osu-idle/shared/helpers/synced';
import { rpc } from './client';
import Auth from './auth';
import { isCommunityOpen } from '../globals';

/** The accounts the signed-in player blocked: their #osu!idle lines show as
 *  `<block>`. Blocking happens on the web profile, so it's re-read whenever
 *  the overlay opens. */
export const blocked = new Synced<ReadonlySet<number>>(new Set());

const load = async (): Promise<void> => {
	if (!Auth.user.get()) {
		void blocked.set(new Set());
		return;
	}
	try {
		const res = await rpc.v1.social.blocks.$get();
		if (res.ok) void blocked.set(new Set(await res.json()));
	} catch (e) {
		console.warn('[blocks] could not load', e);
	}
};

void Auth.user.sync(() => void load());
void isCommunityOpen.sync(open => { if (open) void load(); });
