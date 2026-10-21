import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import PlayManager from '../../online/playManager';
import PlayQueue from '../../gameplay/playQueue';

/** The dock's pause/resume, for while the dock is out of sight. */
export default function QueuePauseButton() {
	const { t } = useLingui();
	const [queue] = useSynced(PlayQueue.state);
	const [paused] = useSynced(PlayManager.paused);
	if (!queue || !PlayQueue.next()) return null;

	return (
		<button
			className="play__quit"
			onClick={() => PlayManager.setPaused(!paused)}
			title={paused
				? t`Start playing the queue again`
				: t`Let this play finish, then wait`}
		>
			{paused ? <Trans>resume</Trans> : <Trans>pause</Trans>}
		</button>
	);
}
