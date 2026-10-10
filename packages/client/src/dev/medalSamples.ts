import { MEDALS } from '@osu-idle/shared/achievements/catalogue';
import {
	medalUnlocks,
	type MedalUnlock,
} from '../achievements/medalUnlocks';

/** built on demand: the names need Lingui's locale, set after load */
export const medalSamples = (): MedalUnlock[] => medalUnlocks(MEDALS.map(m => m.id));

const pick = (...ids: string[]) => () => medalSamples().filter(m => ids.includes(m.id));

export const MEDALS_ONE = pick('first-10');
export const MEDALS_THREE = pick('plays-100', 'pass-5', 'combo-727');
export const MEDALS_FIVE = pick('upgrade-1', 'plays-1k', 'grade-ss', 'first-10', 'night-owl');
/** roughly what a top character gets at backfill */
export const MEDALS_BACKFILL = () => medalSamples()
	.filter(m => m.look.tier !== 'divine' || m.id === 'rebirth')
	.filter((_, i) => i % 2 === 0 || i < 20);
