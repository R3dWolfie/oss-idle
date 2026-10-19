import BeatmapAPI from './beatmap_api';
import LightBeatmapSet from './LightBeatmapSet';
import PlayManager from '../../online/playManager';

/** A difficulty as song select's card, from the library or the catalog. */
export const findCard = async (beatmapId: number, setId: number) => {
	const downloaded = await PlayManager.findDownloaded(beatmapId);
	if (downloaded) return {
		beatmap: downloaded, set: downloaded.set,
	};
	const meta = (await BeatmapAPI.getManifest()).beatmaps.find(s => s.id === setId);
	return meta && LightBeatmapSet.fromMetadata(meta).getCarouselItems()
		.find(i => i.beatmap.metadata.id === beatmapId);
};
