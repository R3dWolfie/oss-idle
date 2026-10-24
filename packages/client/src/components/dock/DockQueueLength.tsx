import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock } from '@fortawesome/free-solid-svg-icons/faClock';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import { length } from '@oss-idle/shared/display/length';
import PlayQueue from '../../gameplay/playQueue';
import { selectedRate } from '../../gameplay/playRate';

/** How long one pass through the queue plays, each map at its rate and as
 *  many times as it has left. */
export default function DockQueueLength() {
	const [queue] = useSynced(PlayQueue.state);
	const [rate] = useSynced(selectedRate);
	if (!queue?.entries.length) return null;
	const ms = queue.entries
		.reduce((sum, { beatmap: b, repeat = 1, played = 0 }) =>
			sum + (repeat - played) * b.metadata.total_length / (b.lockedRate ?? rate), 0);
	return (
		<span className="dock__length">
			<FontAwesomeIcon icon={faClock} />
			{length(ms / 1000)}
		</span>
	);
}
