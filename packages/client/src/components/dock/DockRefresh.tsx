import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotate } from '@fortawesome/free-solid-svg-icons/faRotate';
import {
	useEffect,
	useState,
} from 'react';
import { useLingui } from '@lingui/react/macro';
import HoverCard from '@oss-idle/shared/display/HoverCard';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import PlayQueue from '../../gameplay/playQueue';
import { playlistsVersion } from '../../db/schema/playlist';

// add-ons write playlists straight into the save, which bumps no version
const RECHECK_MS = 2_000;

/** Refresh the queue from its playlist, shown once that playlist was edited. */
export default function DockRefresh() {
	const { t } = useLingui();
	const [queue] = useSynced(PlayQueue.state);
	const [version] = useSynced(playlistsVersion);
	const [changed, setChanged] = useState(false);

	useEffect(() => {
		let live = true;
		const check = () => void PlayQueue.playlistChanged().then(c => live && setChanged(c));
		check();
		const timer = window.setInterval(check, RECHECK_MS);
		return () => {
			live = false;
			window.clearInterval(timer);
		};
	}, [queue, version]);

	if (!changed) return null;
	const label = t`Playlist changed: refresh the queue`;
	return (
		<HoverCard card={label}>
			<button
				type="button"
				className="dock__refresh"
				aria-label={label}
				onClick={() => void PlayQueue.refreshFromPlaylist().then(() => setChanged(false))}
			>
				<FontAwesomeIcon icon={faRotate} />
			</button>
		</HoverCard>
	);
}
