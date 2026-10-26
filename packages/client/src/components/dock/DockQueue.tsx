import { faArrowDown } from '@fortawesome/free-solid-svg-icons/faArrowDown';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons/faArrowUp';
import { faClone } from '@fortawesome/free-solid-svg-icons/faClone';
import { faMinus } from '@fortawesome/free-solid-svg-icons/faMinus';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { faRepeat } from '@fortawesome/free-solid-svg-icons/faRepeat';
import { faXmark } from '@fortawesome/free-solid-svg-icons/faXmark';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import {
	useEffect,
	useRef,
	useState,
} from 'react';

import useSynced from '@oss-idle/shared/hooks/useSynced';
import { MAX_REPEAT } from '@oss-idle/shared/queue';

import PlayQueue from '../../gameplay/playQueue';
import Marquee from '../Marquee';
import RatedVersion from '../RatedVersion';
import DockCountdown from './DockCountdown';
import DockCountdownBar from './DockCountdownBar';
import DockRefresh from './DockRefresh';
import useQueueDrag from './useQueueDrag';

// how long the − / + wait for another click before the count is sent: one edit for a burst, not one each
// (every edit's echo from the server set the count back through the older ones)
const REPEAT_SEND_MS = 400;

const clampRepeat = (n: number) => Math.max(1, Math.min(MAX_REPEAT, Math.round(n)));

/** A row's repeat count: − and + step it, or type it. It shows at once and is sent once you stop; a run
 *  under way keeps its plays in front (`1/` 29). */
function RepeatCount({ index, repeat, played }: { index: number, repeat: number, played: number }) {
	const { t } = useLingui();
	// what is shown while it isn't sent yet, as typed
	const [draft, setDraft] = useState<string>();
	const timer = useRef<number>(undefined);
	const cancelled = useRef(false);
	useEffect(() => () => window.clearTimeout(timer.current), []);
	const shown = draft === undefined ? repeat : clampRepeat(Number(draft) || 1);

	const send = (n: number) => {
		window.clearTimeout(timer.current);
		setDraft(undefined);
		if (n !== repeat) PlayQueue.setRepeat(index, n);
	};
	// the count a burst of clicks is at, before the render after each one catches up
	const latest = useRef(shown);
	latest.current = shown;
	const step = (by: number) => {
		const n = clampRepeat(latest.current + by);
		latest.current = n;
		setDraft(String(n));
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => send(n), REPEAT_SEND_MS);
	};
	return (<>
		<button
			type="button"
			aria-label={t`Play it one time fewer`}
			disabled={shown <= 1}
			onClick={() => step(-1)}
		>
			<FontAwesomeIcon icon={faMinus} />
		</button>
		<label className="dock__repeat dock__repeat-count">
			<FontAwesomeIcon icon={faRepeat} />
			{played > 0 && <span className="dock__repeat-played">{played}/</span>}
			<input
				className="dock__repeat-input"
				inputMode="numeric"
				aria-label={t`Times to play it`}
				value={draft ?? String(repeat)}
				// as wide as its digits, so `1/29` reads as one
				style={{ width: `${Math.max(1, (draft ?? String(repeat)).length) + 0.4}ch` }}
				// the row drags from anywhere but here, and keys stay in the box
				onPointerDown={e => e.stopPropagation()}
				onKeyDown={e => {
					e.stopPropagation();
					if (e.key === 'Enter') e.currentTarget.blur();
					if (e.key === 'Escape') {
						// put it back: the blur below must not send what was typed
						window.clearTimeout(timer.current);
						cancelled.current = true;
						setDraft(undefined);
						e.currentTarget.blur();
					}
				}}
				onFocus={e => e.currentTarget.select()}
				onChange={e => {
					window.clearTimeout(timer.current);
					setDraft(e.target.value.replace(/\D/g, '').slice(0, 3));
				}}
				onBlur={() => {
					if (!cancelled.current && draft !== undefined) send(shown);
					cancelled.current = false;
				}}
			/>
		</label>
		<button
			type="button"
			aria-label={t`Play it one more time`}
			disabled={shown >= MAX_REPEAT}
			onClick={() => step(1)}
		>
			<FontAwesomeIcon icon={faPlus} />
		</button>
	</>);
}

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
							<RepeatCount index={index} repeat={repeat} played={played} />
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
