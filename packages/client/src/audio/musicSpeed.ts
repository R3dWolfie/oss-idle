import Synced from '@oss-idle/shared/helpers/synced';
import { music } from './MusicPlayer';
import { SETTINGS } from '../db/settings';
import { selectedRate } from '../gameplay/playRate';
import PlayManager from '../online/playManager';
import SceneManager, { SCENE } from '../scenes/SceneManager';

/** The streaming track follows the rate picked in song select, at once, or the
 *  selected playlist entry's locked one - except in the screensaver, where it
 *  follows the running play's. */
void Synced.all([
	selectedRate, SETTINGS.pitchFollowsRate, SceneManager.current, PlayManager.live, music.beatmap,
], () => {
	const live = PlayManager.live.get();
	const rate = SceneManager.current.get() === SCENE.SAVER && live
		? live.rate
		: music.beatmap.get()?.lockedRate ?? selectedRate.get();
	music.setSpeed(rate, !SETTINGS.pitchFollowsRate.get());
});
