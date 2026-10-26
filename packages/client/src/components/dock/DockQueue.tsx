import { faArrowDown } from '@fortawesome/free-solid-svg-icons/faArrowDown';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons/faArrowUp';
import { faClone } from '@fortawesome/free-solid-svg-icons/faClone';
import { faRepeat } from '@fortawesome/free-solid-svg-icons/faRepeat';
import { faXmark } from '@fortawesome/free-solid-svg-icons/faXmark';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import { useRef } from 'react';

import useSynced from '@oss-idle/shared/hooks/useSynced';

import PlayQueue from '../../gameplay/playQueue';
import Marquee from '../Marquee';
import RatedVersion from '../RatedVersion';
import DockCountdown from './DockCountdown';
import DockCountdownBar from './DockCountdownBar';
import DockRefresh from './DockRefresh';
import DockRepeatCount from './DockRepeatCount';
import useQueueDrag from './useQueueDrag';

type Props = {
	/** the carousel is open beside it, so an empty queue is worth explaining */
	hint?: boolean;
};

/** What is lined up behind the running play, in the order it plays: the first
 *  row says when it starts, and every row can be dragged, moved, repeated,
 *  duplicated or dropped. */
export default function DockQueue({ hint = false }: Props) {
	const { t } = useLingui();
	const [queue] = useSynced(PlayQueue.state);
	const entries = queue?.entries ?? [];
	const list = useRef<HTMLOListElement>(null);
	const { rows, dragging, start } = useQueueDrag(list, entries);
	if (!entries.length) {
		if (!hint) return null;
		return (
			<div className="dock__queue">
				<div className="dock__empty">
					<Trans>Nothing queued. Click a map to add it.</Trans>
				</div>
			</div>
		);
	}

	return (
		<div className="dock__queue">
			<div className="dock__queue-head">
				<span><Trans>Up next</Trans></span>
				<span className="dock__count">{entries.length}</span>
				<DockRefresh />
			</div>
			<ol ref={list} className="dock__list">
				{rows.map(({ item: { beatmap, repeat = 1, played = 0 }, from }, index) => (
					<li
						key={`${beatmap.metadata.id}-${beatmap.lock}-${from}`}
						className={`dock__entry ${index === 0 ? 'is-next' : ''} ${from === dragging ? 'is-dragging' : ''}`}
						onPointerDown={start(index)}
					>
						<span className="dock__num">{index + 1}</span>
						<Marquee className="dock__entry-name">
							{beatmap.set.metadata.artist} - {beatmap.set.metadata.title}
							<RatedVersion
								version={beatmap.metadata.version}
								rate={beatmap.lockedRate}
								mods={beatmap.lockedMods}
							/>
						</Marquee>
						{repeat > 1 && (
							<span className="dock__repeat">
								<FontAwesomeIcon icon={faRepeat} />
								{played ? `${played}/${repeat}` : repeat}
							</span>
						)}
						{index === 0 && <DockCountdown />}
						{index === 0 && <DockCountdownBar />}
						<span className="dock__entry-actions">
							<DockRepeatCount index={index} repeat={repeat} played={played} />
							<button
								type="button"
								aria-label={t`Duplicate`}
								onClick={() => PlayQueue.duplicate(index)}
							>
								<FontAwesomeIcon icon={faClone} />
							</button>
							<button
								type="button"
								aria-label={t`Move up`}
								disabled={index === 0}
								onClick={() => PlayQueue.move(index, index - 1)}
							>
								<FontAwesomeIcon icon={faArrowUp} />
							</button>
							<button
								type="button"
								aria-label={t`Move down`}
								disabled={index === entries.length - 1}
								onClick={() => PlayQueue.move(index, index + 1)}
							>
								<FontAwesomeIcon icon={faArrowDown} />
							</button>
							<button
								type="button"
								aria-label={t`Remove from the queue`}
								onClick={() => PlayQueue.remove(index)}
							>
								<FontAwesomeIcon icon={faXmark} />
							</button>
						</span>
					</li>
				))}
			</ol>
		</div>
	);
}
