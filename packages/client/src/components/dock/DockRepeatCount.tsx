import { faMinus } from '@fortawesome/free-solid-svg-icons/faMinus';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { faRepeat } from '@fortawesome/free-solid-svg-icons/faRepeat';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLingui } from '@lingui/react/macro';
import {
	useEffect,
	useRef,
	useState,
} from 'react';

import { MAX_REPEAT } from '@oss-idle/shared/queue';

import PlayQueue from '../../gameplay/playQueue';

// − / + clicks closer than this are sent as one edit
const REPEAT_SEND_MS = 400;

const clampRepeat = (n: number) => Math.max(1, Math.min(MAX_REPEAT, Math.round(n)));

type Props = {
	index: number;
	repeat: number;
	played: number;
};

/** A row's repeat count: − and + step it, or type it. It shows at once and is sent once you stop; a run
 *  under way keeps its plays in front (`1/` 29). */
export default function DockRepeatCount({ index, repeat, played }: Props) {
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
