import './Marquee.css';
import {
	useEffect,
	useRef,
	useState,
	type ReactNode,
} from 'react';

// px per second
const SPEED = 30;

type Props = {
	className?: string;
	children: ReactNode;
};

/** One line of text that loops leftwards, ticker-style, when it doesn't fit. */
export default function Marquee({ className = '', children }: Props) {
	const box = useRef<HTMLDivElement>(null);
	const track = useRef<HTMLDivElement>(null);
	const text = useRef<HTMLDivElement>(null);
	const [scrolling, setScrolling] = useState(false);

	useEffect(() => {
		const outer = box.current;
		const inner = track.current;
		const first = text.current;
		if (!outer || !inner || !first) return;
		const ro = new ResizeObserver(() => {
			setScrolling(first.offsetWidth > outer.clientWidth);
			// the track holds the text twice, so one loop is half of it
			inner.style.setProperty('--marquee-duration', `${inner.offsetWidth / 2 / SPEED}s`);
		});
		ro.observe(outer);
		ro.observe(inner);
		ro.observe(first);
		return () => ro.disconnect();
	}, []);

	return (
		<div ref={box} className={`marquee ${scrolling ? 'is-scrolling' : ''} ${className}`}>
			<div ref={track} className="marquee__track">
				<div ref={text}>{children}</div>
				{scrolling && <div aria-hidden>{children}</div>}
			</div>
		</div>
	);
}
