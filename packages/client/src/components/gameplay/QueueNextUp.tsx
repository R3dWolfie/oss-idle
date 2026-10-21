import { Trans } from '@lingui/react/macro';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import RatedVersion from '../RatedVersion';
import PlayManager from '../../online/playManager';
import PlayQueue from '../../gameplay/playQueue';

/** Playlist autopilot HUD: what plays next. */
export default function QueueNextUp() {
	const [queue] = useSynced(PlayQueue.state);
	const [paused] = useSynced(PlayManager.paused);
	if (!queue) return null;

	const next = PlayQueue.next();
	return (
		<div className="play__autopilot">
			<div className="play__autopilot-next">
				{paused ? <Trans>Paused, next:</Trans> : <Trans>Next up:</Trans>} {next
					? <>
						{next.set.metadata.artist} - {next.set.metadata.title}
						<RatedVersion version={next.metadata.version} rate={next.lockedRate} />
					</>
					: '-'}
			</div>
		</div>
	);
}
