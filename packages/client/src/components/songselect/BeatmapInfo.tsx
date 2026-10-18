import { ph } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { bpm } from '@osu-idle/shared/display/num';
import { length } from '@osu-idle/shared/display/length';
import LightBeatmap from '../../osu/beatmap/LightBeatmap';
import Leaderboard from '../leaderboard/Leaderboard';
import useSynced from '@osu-idle/shared/hooks/useSynced';
import useAsync from '@osu-idle/shared/hooks/useAsync';
import { selectedRate } from '../../gameplay/playRate';
import { starsAt } from '../../osu/difficulty';
import {
	rateStars,
	starsOf,
	useRatedVersion,
} from '../../gameplay/rateStars';

/** The selected difficulty's details and its scores - the top bar's left and
 *  right halves. Drawn only by the scene: over a running play, neither belongs
 *  on screen. */
export default function BeatmapInfo({
	version,
	scoreView,
	setScoreView,
}: {
	version: LightBeatmap;
	scoreView: boolean;
	setScoreView: (v: boolean) => void;
}) {
	const [rate] = useSynced(selectedRate);
	const [rated] = useSynced(rateStars);
	// a map the server doesn't rank has no stars there: work them out from its file
	const local = useAsync(async () => rate === 1 || rated.has(version.metadata.id)
		? undefined
		: await starsAt(version.set.metadata.id, version.metadata.id, rate),
	[version, rate, rated]);
	const stars = local ?? starsOf(version);
	const shownVersion = useRatedVersion(version.metadata.version);
	// pre-formatted so the <Trans> placeholders read by name (e.g. {totalLength})
	// in the catalog instead of positional {0}. A rate changes all three.
	const totalLength = length(version.metadata.total_length / 1000 / rate);
	const bpmText = bpm(version.metadata.bpm * rate);
	const title = `${version.set.metadata.artist} - ${version.set.metadata.title} [${shownVersion}]`;
	const icon = `url('${version.metadata.runtime ? '/ranked.png' : '/unknown.png'}')`;

	return (
		<div className="game__topinfo">
			<div className="game__top_md-container">
				<div className="game__top_md">
					<div className="game__top_md_icon">
						<div style={{ backgroundImage: icon }}></div>
					</div>
					<div className="game__top_md_text">
						<div className="game__top_md_title">
							{title}
						</div>
						<div className="game__top_md_creator">
							<Trans>Mapped by {ph({ creator: version.set.metadata.creator })}</Trans>
						</div>
					</div>
				</div>
				<div className="game__top_version">
					<div className="game__top_music">
						<Trans>Length: {totalLength} BPM: {bpmText} Objects: {ph({ objects: version.metadata.objects })}</Trans>
					</div>
					<div className="game__top_hos">
						<Trans>Rice: {ph({ rice: version.metadata.rice })} LN: {ph({ ln: version.metadata.ln })}</Trans>
					</div>
					<div className="game__top_diff">
						<Trans>Star Rating: {ph({ stars: Math.round(stars * 100) / 100 })}★</Trans>
					</div>
				</div>
			</div>
			<div className="game__top_lb-container">
				<button
					className='mobile__scores'
					onClick={() => setScoreView(!scoreView)}
				>
					{scoreView ? <Trans>Back</Trans> : <Trans>Show scores</Trans>}
				</button>

				<Leaderboard />
			</div>
		</div>
	);
}
