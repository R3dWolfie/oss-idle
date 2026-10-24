import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons/faArrowRight';
import { faBan } from '@fortawesome/free-solid-svg-icons/faBan';
import { faListUl } from '@fortawesome/free-solid-svg-icons/faListUl';
import { faRepeat } from '@fortawesome/free-solid-svg-icons/faRepeat';
import { faRotate } from '@fortawesome/free-solid-svg-icons/faRotate';
import { faShuffle } from '@fortawesome/free-solid-svg-icons/faShuffle';
import {
	useEffect,
	useState,
} from 'react';
import { Trans } from '@lingui/react/macro';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import { playlistsVersion } from '../../db/schema/playlist';
import Marquee from '../Marquee';
import DockQueueLength from './DockQueueLength';
import PlayQueue, {
	AUTOPILOT_MODE,
	autopilotModeLabels,
} from '../../gameplay/playQueue';

const MODE_ICON = {
	[AUTOPILOT_MODE.DISABLED]: faBan,
	[AUTOPILOT_MODE.PLAYLIST]: faListUl,
	[AUTOPILOT_MODE.NEXT]: faArrowRight,
	[AUTOPILOT_MODE.SHUFFLE]: faShuffle,
	[AUTOPILOT_MODE.LOOP]: faRepeat,
};

// a playlist can also change from outside the game (an add-on or tool writing the
// save), which bumps no version: look again this often
const DRIFT_RECHECK_MS = 30_000;

/** Where the queue came from: its autopilot mode and the playlist or group,
 *  how long it plays, and a refresh once that playlist no longer holds what the queue does. */
export default function DockSource() {
	const [queue] = useSynced(PlayQueue.state);
	const [version] = useSynced(playlistsVersion);
	const [drifted, setDrifted] = useState(false);

	useEffect(() => {
		let live = true;
		const check = () => void PlayQueue.playlistDrift().then(d => live && setDrifted(!!d));
		check();
		const timer = window.setInterval(check, DRIFT_RECHECK_MS);
		return () => {
			live = false;
			window.clearInterval(timer);
		};
	}, [queue, version]);

	if (!queue?.mode && !queue?.label && !queue?.entries.length) return null;
	return (
		<span className="dock__source">
			{queue.mode && <FontAwesomeIcon icon={MODE_ICON[queue.mode]} />}
			{queue.mode && <span>{autopilotModeLabels()[queue.mode]}</span>}
			{queue.label && <Marquee className="dock__source-label">{queue.label}</Marquee>}
			{drifted && (
				<button
					className="dock__source-refresh"
					onClick={() => void PlayQueue.refreshFromPlaylist().then(() => setDrifted(false))}
				>
					<FontAwesomeIcon icon={faRotate} />
					<Trans>Playlist changed · refresh</Trans>
				</button>
			)}
			<DockQueueLength />
		</span>
	);
}
