import type Synced from '@oss-idle/shared/helpers/synced';
import SceneManager from '../scenes/SceneManager';
import PlayManager from '../online/playManager';
import { music } from '../audio/MusicPlayer';
import {
	isCommunityOpen,
	isOptionsOpen,
	isWebOpen,
	openPage,
} from '../globals';
import type LightBeatmap from '../osu/beatmap/LightBeatmap';

/**
 * What the game was doing, for the frame profiler's reports: the state now, and
 * a timeline of what changed (scene, map, plays, overlays, focus, window size).
 */

const MAX_EVENTS = 1000;

export const timeline: {
	at: number;
	what: string;
}[] = [];

const event = (what: string) => {
	timeline.push({
		at: Math.round(performance.now()), what,
	});
	if (timeline.length > MAX_EVENTS) timeline.shift();
};

const mapName = (beatmap?: LightBeatmap) => beatmap
	? `${beatmap.set.metadata.artist} - ${beatmap.set.metadata.title} [${beatmap.metadata.version}]`
	: 'none';

const watch = <T>(name: string, synced: Synced<T>, show: (value: T) => unknown = String) =>
	void synced.sync(value => event(`${name} ${show(value)}`));

watch('scene', SceneManager.current);
watch('map', music.beatmap, mapName);
watch('play', PlayManager.live, live => live ? `x${live.rate}` : 'none');
watch('options', isOptionsOpen);
watch('community', isCommunityOpen);
watch('web', isWebOpen);
watch('page', openPage, page => page?.page ?? 'none');
window.addEventListener('focus', () => event('focus back'));
window.addEventListener('blur', () => event('focus lost'));
document.addEventListener('visibilitychange',
	() => event(`visibility ${document.visibilityState}`));
window.addEventListener('resize', () => event(`window ${innerWidth}x${innerHeight}`));

/** The last value of each watched state at a time: the scene a frame dropped in. */
export const stateAt = (at: number): string => {
	const latest = new Map<string, string>();
	for (const e of timeline) {
		if (e.at > at) break;
		latest.set(e.what.split(' ')[0], e.what);
	}
	return [...latest.values()].filter(what => !/ (false|none|back)$/.test(what)).join(', ');
};

export const context = () => ({
	now: stateAt(Infinity),
	focused: document.hasFocus(),
	visibility: document.visibilityState,
	window: `${innerWidth}x${innerHeight}`,
});
