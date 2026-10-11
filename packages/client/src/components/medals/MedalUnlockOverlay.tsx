import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type RefObject,
} from 'react';
import { Trans } from '@lingui/react/macro';
import type { MedalUnlock } from '../../achievements/medalUnlocks';
import { closeMedals } from '../../online/medalWatch';
import {
	lookKey,
	medalBitmaps,
} from './medalBitmaps';
import MedalFocus from './MedalFocus';
import MedalShowcase from './MedalShowcase';
import './medals.css';

const CLOSE_MS = 350;
const KEYS = ['Escape', 'Enter', ' '];

/** Feed the cursor to the medals' 3D tilt as CSS variables - no re-render. */
const useParallax = (root: RefObject<HTMLDivElement | null>) => useEffect(() => {
	const el = root.current;
	if (!el) return;
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
}, [root]);

type Props = {
	waves: MedalUnlock[][],
	/** medals the character holds once all of these are in */
	held: number,
};

export default function MedalUnlockOverlay({ waves, held }: Props) {
	const count = waves.flat().length;
	const [bitmaps, setBitmaps] = useState<Map<string, string>>();
	/** everything up to here is shown at once, silently */
	const [skipTo, setSkipTo] = useState(0);
	const [arrived, setArrived] = useState(0);
	const [focused, setFocused] = useState<MedalUnlock>();
	/** how many medals were up when the player closed; a newcomer reopens it */
	const [closedAt, setClosedAt] = useState<number>();
	const root = useRef<HTMLDivElement>(null);

	const finished = arrived === count;
	const closing = closedAt === count;
	useParallax(root);

	useEffect(() => {
		let live = true;
		void medalBitmaps(waves.flat().map(m => m.look)).then(b => live && setBitmaps(b));
		return () => {
			live = false;
		};
	}, [waves]);

	useEffect(() => {
		if (!closing) return;
		const timer = setTimeout(closeMedals, CLOSE_MS);
		return () => clearTimeout(timer);
	}, [closing]);

	const advance = useCallback(() => {
		if (focused) setFocused(undefined);
		else if (finished) setClosedAt(count);
		else setSkipTo(count);
	}, [count, finished, focused]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (!KEYS.includes(e.key)) return;
			e.preventDefault();
			e.stopImmediatePropagation();
			advance();
		};
		window.addEventListener('keydown', onKey, { capture: true });
		return () => window.removeEventListener('keydown', onKey, { capture: true });
	}, [advance]);

	const unfocus = useCallback(() => setFocused(undefined), []);

	return <div
		ref={root}
		className={`medal-overlay ${closing ? 'is-closing' : ''} ${focused ? 'is-focused' : ''}`}
		onClick={advance}
	>
		<MedalShowcase
			waves={waves}
			held={held}
			bitmaps={bitmaps}
			skipTo={skipTo}
			onArrived={setArrived}
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
