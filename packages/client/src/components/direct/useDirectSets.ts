import useAsync from '@oss-idle/shared/hooks/useAsync';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import { INTRO_SET_ID } from '@oss-idle/shared/beatmap';
import BeatmapAPI, { type Metadata } from '../../osu/beatmap/beatmap_api';
import BeatmapStore, { beatmapsVersion } from '../../osu/beatmap/beatmap_store';
import { rpc } from '../../online/client';
import { directDisplay } from './directState';

const rankedSets = async () =>
	(await BeatmapAPI.getManifest()).beatmaps.filter(s => s.id !== INTRO_SET_ID);

const unrankedSets = async (): Promise<Metadata[]> =>
	(await rpc.v1.beatmap.unranked.$get()).json();

/** Every set the Display filter lists, and which of them are downloaded. */
export default function useDirectSets() {
	const [library] = useSynced(beatmapsVersion);
	const [display] = useSynced(directDisplay);
	return useAsync(async () => {
		const lists = await Promise.all([
			display !== 'unranked' ? rankedSets() : [],
			display !== 'ranked' ? unrankedSets() : [],
		]);
		const sets = lists.flat();
		const stored = await Promise.all(sets.map(s => BeatmapStore.has(s.id)));
		return {
			sets,
			downloaded: new Set(sets.filter((_, i) => stored[i]).map(s => s.id)),
		};
	}, [library, display]);
}
