import './ProfileTabs.css';
import {
	type RefObject,
	useEffect,
	useState,
} from 'react';

type Tab = { el: HTMLElement; title: string };

// the shrunk topbar plus this bar
const STICKY_OFFSET = 100;

/** osu!web's sticky profile tabs: one per block in `blocks`, scrolling to it. */
export default function ProfileTabs({ blocks }: { blocks: RefObject<HTMLElement> }) {
	const [tabs, setTabs] = useState<Tab[]>([]);
	const [active, setActive] = useState(0);

	useEffect(() => {
		const root = blocks.current;
		if (!root) return;
		// blocks load on their own, so watch them appear
		const collect = () => setTabs([...root.children].flatMap(el => {
			const title = el.querySelector('.character__block-title')?.textContent;
			return el instanceof HTMLElement && title ? [{
				el, title, 
			}] : [];
		}));
		collect();
		const observer = new MutationObserver(collect);
		observer.observe(root, { childList: true });
		return () => observer.disconnect();
	}, [blocks]);

	useEffect(() => {
		const onScroll = () => setActive(tabs.reduce(
			(last, t, i) => (t.el.getBoundingClientRect().top <= STICKY_OFFSET + 1 ? i : last),
			0,
		));
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, [tabs]);

	if (tabs.length < 2) return null;

	return <nav className='profile-tabs'>
		{tabs.map((t, i) => <button
			key={t.title}
			type='button'
			className={`profile-tabs__item ${i === active ? 'profile-tabs__item--active' : ''}`}
			onClick={() => window.scrollTo({
				top: window.scrollY + t.el.getBoundingClientRect().top - STICKY_OFFSET,
				behavior: 'smooth',
			})}
		>{t.title}</button>)}
	</nav>;
}
