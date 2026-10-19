import {
	useEffect,
	useState,
} from 'react';
import { Trans } from '@lingui/react/macro';
import useAsync from '@oss-idle/shared/hooks/useAsync';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import type { Match } from '@oss-idle/shared/multiplayer';
import BeatmapCard from '../BeatmapCard';
import type { DownloadState } from '../BeatmapCarousel';
import BeatmapAPI from '../../osu/beatmap/beatmap_api';
import { beatmapsVersion } from '../../osu/beatmap/beatmap_store';
import { findCard } from '../../osu/beatmap/findCard';
import { music } from '../../audio/MusicPlayer';

/** The match's map; a player without it clicks it to download. */
export default function MatchBeatmap({ match, noMap }: { match: Match, noMap: boolean }) {
	const [library] = useSynced(beatmapsVersion);
	const [download, setDownload] = useState<DownloadState>();
	const map = match.beatmap;
	const card = useAsync(async () => map && findCard(map.id, map.setId), [map?.id, library]);

	// the host's pick plays for everyone, as song select would
	useEffect(() => {
		const beatmap = card?.beatmap;
		if (!beatmap || beatmap.metadata.id === music.beatmap.get()?.metadata.id) return;
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
				downloads={{
					[map.setId]: download ?? {
						status: noMap ? 'idle' : 'done', progress: noMap ? 0 : 1,
					},
				}}
			/>
		</div>
	);
}
