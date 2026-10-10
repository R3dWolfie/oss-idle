import {
	useEffect,
	useState,
} from 'react';
import { Trans } from '@lingui/react/macro';
import useAsync from '@osu-idle/shared/hooks/useAsync';
import useSynced from '@osu-idle/shared/hooks/useSynced';
import type { Match } from '@osu-idle/shared/multiplayer';
import BeatmapCard from '../BeatmapCard';
import type { DownloadState } from '../BeatmapCarousel';
import BeatmapAPI from '../../osu/beatmap/beatmap_api';
import { beatmapsVersion } from '../../osu/beatmap/beatmap_store';
import LightBeatmapSet from '../../osu/beatmap/LightBeatmapSet';
import PlayManager from '../../online/playManager';
import { music } from '../../audio/MusicPlayer';

/** The match's map as song select's card, from the library or the catalog. */
const findCard = async (beatmapId: number, setId: number) => {
	const downloaded = await PlayManager.findDownloaded(beatmapId);
	if (downloaded) return {
		beatmap: downloaded, set: downloaded.set,
	};
	const meta = (await BeatmapAPI.getManifest()).beatmaps.find(s => s.id === setId);
	return meta && LightBeatmapSet.fromMetadata(meta).getCarouselItems()
		.find(i => i.beatmap.metadata.id === beatmapId);
};

/** The match's map; a player without it clicks it to download. */
export default function MatchBeatmap({ match, noMap }: { match: Match, noMap: boolean }) {
	const [library] = useSynced(beatmapsVersion);
	const [download, setDownload] = useState<DownloadState>();
	const map = match.beatmap;
	const card = useAsync(async () => map && findCard(map.id, map.setId), [map?.id, library]);

	// the host's pick plays for everyone, as song select would
	useEffect(() => {
		const beatmap = card?.beatmap;
		if (!beatmap || beatmap.is(music.beatmap.get())) return;
		void music.beatmap.set(beatmap)
			.then(() => music.play(beatmap.metadata.runtime ? beatmap.metadata.previewTime : 0));
	}, [card?.beatmap]);

	if (match.changingBeatmap) {
		return <div className="mp-map__changing"><Trans>Host is changing map...</Trans></div>;
	}
	if (!map || !card) return null;

	const fetch = async () => {
		if (!noMap || download) return;
		const meta = (await BeatmapAPI.getManifest()).beatmaps.find(s => s.id === map.setId);
		if (!meta) return;
		setDownload({
			status: 'downloading', progress: 0,
		});
		try {
			await BeatmapAPI.downloadOsz(meta, progress => setDownload({
				status: 'downloading', progress,
			}));
		} finally {
			setDownload(undefined);
		}
	};

	return (
		<div className="mp-map">
			<BeatmapCard
				beatmap={card.beatmap}
				set={card.set}
				onCardClick={() => void fetch()}
				onCardDoubleClick={() => void fetch()}
				hasDownloaded={!noMap}
				downloads={{
					[map.setId]: download ?? {
						status: noMap ? 'idle' : 'done', progress: noMap ? 0 : 1,
					},
				}}
			/>
		</div>
	);
}
