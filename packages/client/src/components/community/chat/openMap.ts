import {
	isCommunityOpen,
	isWebOpen,
	openPage,
	webUrl,
} from '../../../globals';
import { music } from '../../../audio/MusicPlayer';
import { findCard } from '../../../osu/beatmap/findCard';
import SceneManager, { SCENE } from '../../../scenes/SceneManager';
import { queueSelection } from '../../songselect/selection';
import type { MapRef } from './links';

/** A map clicked in chat: song select moves to it, the main menu plays it,
 *  anywhere else nothing happens. A map the game doesn't list: its page on the site. */
export async function openChatMap(map: MapRef): Promise<void> {
	const scene = SceneManager.current.get();
	if (scene !== SCENE.SELECT && scene !== SCENE.MENU) return;
	const beatmap = (await findCard(map.beatmapId, map.setId))?.beatmap;
	if (!beatmap) {
		void webUrl.set(`maps/${map.setId}?diff=${map.beatmapId}`);
		void isWebOpen.set(true);
		return;
	}
	void isCommunityOpen.set(false);
	if (scene === SCENE.MENU) {
		await music.beatmap.set(beatmap);
		await music.play(0);
	} else if (openPage.get()?.page === 'queue') {
		await queueSelection.set(beatmap);
	} else {
		await music.beatmap.set(beatmap);
	}
}
