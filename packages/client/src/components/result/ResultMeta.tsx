import { versionLabel } from '@osu-idle/shared/rate';
import { ph } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { music } from '../../audio/MusicPlayer';
import LightBeatmap from '../../osu/beatmap/LightBeatmap';

/** Title bar: the played map's title/version/creator plus the played-by line.
 *  The map is passed in, not read from the live track: browsing elsewhere while
 *  this is on screen must not rename the score you are looking at. Falls back to
 *  the live track for a score opened from a leaderboard. */
export default function ResultMeta({ 
	playerName, 
	playedAt, 
	beatmap,
	rate,
}: { playerName: string; playedAt: string; beatmap?: LightBeatmap; rate: number }) {
	const live = music.beatmap.use((b) => b);
	const map = beatmap ?? live;
	const track = map && {
		title: map.set.metadata.title,
		artist: map.set.metadata.artist,
		creator: map.set.metadata.creator,
		version: versionLabel(map.metadata.version, rate),
	};
	return (
		<div className="result__meta">
			<div className="result__title">
				{track ? `${track.artist} - ${track.title} ` : <Trans>Result</Trans>}
				{track && <span className="result__version">[{track.version}]</span>}
			</div>
			{track && <div className="result__creator">
				<Trans>Beatmap by {ph({ creator: track.creator })}</Trans>
			</div>}
			<div className="result__played">
				<Trans>Played by {playerName} on {playedAt}</Trans>
			</div>
		</div>
	);
}
