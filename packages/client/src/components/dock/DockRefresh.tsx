import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotate } from '@fortawesome/free-solid-svg-icons/faRotate';
import {
	useEffect,
	useState,
} from 'react';
import { Trans } from '@lingui/react/macro';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import PlayQueue from '../../gameplay/playQueue';
import { playlistsVersion } from '../../db/schema/playlist';

// a playlist can also change from outside the game (an add-on or tool writing the
// save), which bumps no version: look again this often
const DRIFT_RECHECK_MS = 30_000;

/** Refresh the queue from its playlist, shown once that playlist no longer holds
 *  what the queue does. */
export default function DockRefresh() {
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

	if (!drifted) return null;
	return (
		<button
			className="dock__source-refresh"
			onClick={() => void PlayQueue.refreshFromPlaylist().then(() => setDrifted(false))}
		>
			<FontAwesomeIcon icon={faRotate} />
			<Trans>Playlist changed · refresh</Trans>
		</button>
	);
}
