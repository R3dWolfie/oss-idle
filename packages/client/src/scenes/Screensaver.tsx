import { versionLabel } from '@oss-idle/shared/rate';
import { useEffect } from 'react';
import { Trans } from '@lingui/react/macro';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import accuracy from '@oss-idle/shared/display/accuracy';
import { LEAD_IN_MS } from '@oss-idle/shared/sim/maniaGame';
import PlayManager from '../online/playManager';
import { music } from '../audio/MusicPlayer';
import { currentSkin } from '../osu/skin/Skin';
import Controls from '../input/Controls';
import useTick from '../components/dock/useTick';
import { openPage } from '../globals';
import Background from './Background';
import { leaveScreensaver } from './screensaver';
import './Screensaver.css';

/** How long without input before the chrome over the screensaver fades out. */
const IDLE_MS = 4000;

/**
 * Gameplay without the playfield: the queue keeps playing in the background
 * and this only shows the map and how the play is going. Results land quietly,
 * so no medal unlock stops it.
 */
export default function Screensaver() {
	const [live] = useSynced(PlayManager.live);
	const [skin] = useSynced(currentSkin);
	const [page] = useSynced(openPage);
	useTick(!!live);
	Controls.back.usePress(leaveScreensaver);

	// burn-in: the dock, cursor and other fixed chrome fade out (Screensaver.css)
	// until the pointer or a key wakes them; a page open over it stays up
	useEffect(() => {
		if (page) return;
		const html = document.documentElement;
		let timer = 0;
		const wake = () => {
			html.classList.remove('is-saver-idle');
			clearTimeout(timer);
			timer = window.setTimeout(() => html.classList.add('is-saver-idle'), IDLE_MS);
		};
		const events = ['pointermove', 'pointerdown', 'keydown', 'wheel'] as const;
		events.forEach(e => window.addEventListener(e, wake, { passive: true }));
		wake();
		return () => {
			clearTimeout(timer);
			events.forEach(e => window.removeEventListener(e, wake));
			html.classList.remove('is-saver-idle');
		};
	}, [!!page]);

	// the track follows the play, at the play's position
	useEffect(() => {
		if (!live) return;
		if (music.beatmap.get()?.is(live.beatmap.metadata.id) && music.playing.get()) return;
		void music.beatmap.set(live.beatmap)
			// the play's time is real time; the track runs at the play's rate
			.then(() => music.play((Date.now() - live.startedAt - LEAD_IN_MS) * live.rate));
	}, [live?.token]);

	if (!live) {
		return (<>
			<div className="screensaver__backdrop"><Background /></div>
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
		<div className="screensaver__backdrop"><Background beatmap={live.beatmap} /></div>
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
