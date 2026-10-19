import Synced from '@oss-idle/shared/helpers/synced';
import BeatmapAPI, { type Metadata } from './beatmap_api';
import BeatmapStore from './beatmap_store';

/** The supporter "download every ranked beatmap" run: its progress while it goes. */
export const bulkDownload = new Synced<{ done: number; total: number } | undefined>(undefined);
let stopping = false;

/** The ranked sets not downloaded yet. */
export const missingSets = async (): Promise<Metadata[]> => {
	const manifest = await BeatmapAPI.getManifest();
	const stored = await Promise.all(manifest.beatmaps.map(m => BeatmapStore.has(m.id)));
	return manifest.beatmaps.filter((_, i) => !stored[i]);
};

/** Download the sets one after another; false when stopped before the end. */
export const downloadAll = async (sets: Metadata[]): Promise<boolean> => {
	stopping = false;
	try {
		for (const [done, set] of sets.entries()) {
			if (stopping) return false;
			await bulkDownload.set({
				done, total: sets.length,
			});
			await BeatmapAPI.downloadOsz(set, undefined, true);
		}
		return true;
	} finally {
		void bulkDownload.set(undefined);
	}
};

export const stopDownloadAll = (): void => { stopping = true; };
