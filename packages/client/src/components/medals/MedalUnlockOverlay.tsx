import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type RefObject,
} from 'react';
import { Trans } from '@lingui/react/macro';
import type { MedalUnlock } from '../../achievements/medalUnlocks';
import PlayManager from '../../online/playManager';
import {
	lookKey,
	medalBitmaps,
} from './medalBitmaps';
import MedalFocus from './MedalFocus';
import MedalShowcase from './MedalShowcase';
import './medals.css';

/** a batch this small closes on its own; a bigger one waits to be looked at */
const AUTO_CLOSE_MAX = 5;
const AUTO_CLOSE_MS = 3000;
const CLOSE_MS = 350;
const KEYS = ['Escape', 'Enter', ' '];

/** Feed the cursor to the medals' 3D tilt as CSS variables - no re-render. */
const useParallax = (root: RefObject<HTMLDivElement | null>, on: boolean) => useEffect(() => {
	const el = root.current;
	if (!on || !el) return;
	let frame = 0;
	let x = window.innerWidth / 2;
	let y = window.innerHeight / 2;
	const apply = () => {
		frame = 0;
		el.style.setProperty('--mx', String(x));
		el.style.setProperty('--my', String(y));
	};
	apply();
	const onMove = (e: PointerEvent) => {
		x = e.clientX;
		y = e.clientY;
		frame ||= requestAnimationFrame(apply);
	};
	window.addEventListener('pointermove', onMove);
	return () => {
		window.removeEventListener('pointermove', onMove);
		cancelAnimationFrame(frame);
	};
}, [on, root]);

type Props = {
	/** what the result screen's play unlocked */
	medals: MedalUnlock[],
};

export default function MedalUnlockOverlay({ medals }: Props) {
	// the batch is the one this screen opened with
	const [batch] = useState(medals);
	const [bitmaps, setBitmaps] = useState<Map<string, string>>();
	const [skip, setSkip] = useState(false);
	const [finished, setFinished] = useState(false);
	const [focused, setFocused] = useState<MedalUnlock>();
	const [closing, setClosing] = useState(false);
	const [closed, setClosed] = useState(false);
	const root = useRef<HTMLDivElement>(null);

	const showing = !closed && batch.length > 0;
	// the queue's countdown waits until the medals have had their moment
	useEffect(() => showing ? PlayManager.hold() : undefined, [showing]);
	useParallax(root, showing);

	useEffect(() => {
		let live = true;
		void medalBitmaps(batch.map(m => m.look)).then(b => live && setBitmaps(b));
		return () => {
			live = false;
		};
	}, [batch]);

	const close = useCallback(() => {
		if (closing) return;
		setClosing(true);
		setTimeout(() => setClosed(true), CLOSE_MS);
	}, [closing]);

	const advance = useCallback(() => {
		if (focused) setFocused(undefined);
		else if (finished) close();
		else setSkip(true);
	}, [close, finished, focused]);

	useEffect(() => {
		if (!finished || focused || batch.length > AUTO_CLOSE_MAX) return;
		const timer = setTimeout(close, AUTO_CLOSE_MS);
		return () => clearTimeout(timer);
	}, [batch.length, close, finished, focused]);

	useEffect(() => {
		if (!showing) return;
		const onKey = (e: KeyboardEvent) => {
			if (!KEYS.includes(e.key)) return;
			e.preventDefault();
			e.stopImmediatePropagation();
			advance();
		};
		window.addEventListener('keydown', onKey, { capture: true });
		return () => window.removeEventListener('keydown', onKey, { capture: true });
	}, [advance, showing]);

	const onArrived = useCallback(() => setFinished(true), []);
	const unfocus = useCallback(() => setFocused(undefined), []);

	if (!showing) return null;

	return <div
		ref={root}
		className={`medal-overlay ${closing ? 'is-closing' : ''} ${focused ? 'is-focused' : ''}`}
		onClick={advance}
	>
		<MedalShowcase
			medals={batch}
			bitmaps={bitmaps}
			skip={skip}
			onArrived={onArrived}
			onFocus={setFocused}
		/>
		{focused && <MedalFocus
			key={focused.id}
			medal={focused}
			bitmap={bitmaps?.get(lookKey(focused.look))}
			onClose={unfocus}
		/>}
		<div className="medal-overlay__hint">
			{focused ? <Trans>Click to go back</Trans>
				: finished ? <Trans>Click a medal to look at it · click elsewhere to continue</Trans>
					: <Trans>Click to skip</Trans>}
		</div>
	</div>;
}
