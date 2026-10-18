import { versionLabel } from '@osu-idle/shared/rate';
import { useEffect } from 'react';
import { Trans } from '@lingui/react/macro';
import useSynced from '@osu-idle/shared/hooks/useSynced';
import accuracy from '@osu-idle/shared/display/accuracy';
import { LEAD_IN_MS } from '@osu-idle/shared/sim/maniaGame';
import PlayManager from '../online/playManager';
import { music } from '../audio/MusicPlayer';
import { currentSkin } from '../osu/skin/Skin';
import Controls from '../input/Controls';
import useTick from '../components/dock/useTick';
import Background from './Background';
import { leaveScreensaver } from './screensaver';
import './Screensaver.css';

/**
 * Gameplay without the playfield: the queue keeps playing in the background
 * and this only shows the map and how the play is going. Results land quietly,
 * so no medal unlock stops it.
 */
export default function Screensaver() {
	const [live] = useSynced(PlayManager.live);
	const [skin] = useSynced(currentSkin);
	useTick(!!live);
	Controls.back.usePress(leaveScreensaver);

	// the track follows the play, at the play's position
	useEffect(() => {
		if (!live) return;
		if (music.beatmap.get()?.is(live.beatmap) && music.playing.get()) return;
		void music.beatmap.set(live.beatmap)
			// the play's time is real time; the track runs at the play's rate
			.then(() => music.play((Date.now() - live.startedAt - LEAD_IN_MS) * live.rate));
	}, [live?.token]);

	if (!live) {
		return (<>
			<Background />
			<div className="screensaver">
				<div className="screensaver__now">
					<div className="screensaver__artist"><Trans>Waiting for the next map</Trans></div>
				</div>
			</div>
		</>);
	}

	const { metadata } = live.beatmap.set;
	const progress = Math.max(0, Math.min(1,
		(Date.now() - live.startedAt) / (live.endsAt - live.startedAt)));

	return (<>
		<Background beatmap={live.beatmap} />
		<div className="screensaver">
			<div className="screensaver__now">
				<div className="screensaver__artist">{metadata.artist}</div>
				<div className="screensaver__title">{metadata.title}</div>
				<div className="screensaver__version">
					[{versionLabel(live.beatmap.metadata.version, live.rate)}]
				</div>
				<div className="screensaver__play">
					{live.grade && skin.grade(live.grade, 'screensaver__grade')}
					{live.accuracy !== undefined && <span>{accuracy(live.accuracy)}</span>}
				</div>
				<div className="screensaver__progress">
					<b style={{ width: `${progress * 100}%` }} />
				</div>
			</div>
		</div>
	</>);
}
