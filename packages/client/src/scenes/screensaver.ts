import { music } from '../audio/MusicPlayer';
import PlayManager from '../online/playManager';
import { launchPlay } from './launchPlay';
import SceneManager, { SCENE } from './SceneManager';

/** Swap gameplay for the screensaver: the play keeps running without a scene,
 *  and its track rides on as it does on quit. */
export const enterScreensaver = () => {
	if (SceneManager.current.get() === SCENE.GAME) music.endGameplay();
	SceneManager.set(SCENE.SAVER);
};

/** Back to watching the running play, or song select when there is none. */
export const leaveScreensaver = () => {
	const live = PlayManager.live.get();
	if (live && launchPlay(live.beatmap)) return;
	SceneManager.set(SCENE.SELECT);
};
