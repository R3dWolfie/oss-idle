import Synced from '@osu-idle/shared/helpers/synced';
import { MedalTiers } from '@osu-idle/shared/achievements/medal';
import type { MedalBatch } from '@osu-idle/shared/play';
import {
	medalUnlocks,
	type MedalUnlock,
} from '../achievements/medalUnlocks';
import Socket from './socket';

export type ShownMedals = {
	/** one per batch, in arrival order, each sorted by tier */
	waves: MedalUnlock[][],
	/** medals the character holds once all of these are in */
	held: number,
};

/** What the medal overlay shows. It stays until the player closes it, and a
 *  batch that comes in meanwhile is added to it. */
export const shownMedals = new Synced<ShownMedals | undefined>(undefined);

const rank = (m: MedalUnlock) => MedalTiers.indexOf(m.look.tier);

export const showMedals = ({ ids, held }: MedalBatch) => {
	const now = shownMedals.get();
	const seen = new Set(now?.waves.flat().map(m => m.id));
	const wave = medalUnlocks(ids.filter(id => !seen.has(id))).sort((a, b) => rank(a) - rank(b));
	if (!wave.length) return;
	void shownMedals.set({
		waves: [...now?.waves ?? [], wave],
		held: Math.max(held, now?.held ?? 0),
	});
};

export const closeMedals = () => void shownMedals.set(undefined);

Socket.on('medals', msg => showMedals(msg.medals));
