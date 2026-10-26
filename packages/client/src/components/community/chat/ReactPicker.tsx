import { faEllipsis } from '@fortawesome/free-solid-svg-icons/faEllipsis';
import { faFaceSmile } from '@fortawesome/free-solid-svg-icons/faFaceSmile';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { t } from '@lingui/core/macro';
import {
	type CSSProperties,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import { createPortal } from 'react-dom';

import {
	type Emoji,
	emojiUsable,
} from '@oss-idle/shared/community/emoji';
import useSynced from '@oss-idle/shared/hooks/useSynced';

import Auth from '../../../online/auth';
import {
	emoji,
	emojiSrc,
} from '../../../online/emoji';
import Socket from '../../../online/socket';

// the ones a chat reaches for most, first; the rest one click away
const QUICK = ['thumbsup', 'joy', 'sob', 'heart', 'fire', 'skull', 'eyes', 'tada'];
// the full list with its search is about this tall: less room above, and it opens below
const ROOM_ABOVE = 240;
// from the window's edge
const MARGIN = 8;

/** Every emoji whose name has `query`: the ones it starts first. */
const search = (list: readonly Emoji[], query: string): Emoji[] => {
	const q = query.trim().toLowerCase().replace(/^:|:$/g, '');
	if (!q) return [...list];
	return [
		...list.filter(e => e.name.startsWith(q)),
		...list.filter(e => !e.name.startsWith(q) && e.name.includes(q)),
	];
};

/** The ☺ on a line under the pointer: a small card of emoji to react with, the common ones first; its ⋯
 *  opens all of them with a search on top (Enter takes the first, Esc closes). */
export default function ReactPicker({ channel, id }: { channel: string, id: string }) {
	const [open, setOpen] = useState(false);
	const [all, setAll] = useState(false);
	const [query, setQuery] = useState('');
	// over the page, not the log (which would cut it): above the ☺, below it near the window's top
	const [at, setAt] = useState<CSSProperties>();
	const button = useRef<HTMLButtonElement>(null);
	const [user] = useSynced(Auth.user);
	const [{ list }] = useSynced(emoji);
	const card = useRef<HTMLDivElement>(null);

	const close = () => {
		setOpen(false);
		setAt(undefined);
		setAll(false);
		setQuery('');
	};
	// too wide to end at the ☺ (a short line on the left): it starts at the window's edge instead
	useLayoutEffect(() => {
		const c = card.current;
		if (!c || c.getBoundingClientRect().left >= MARGIN) return;
		c.style.left = `${MARGIN}px`;
		c.style.right = 'auto';
	}, [at, all]);

	// the whole list stays while you type in it; a click elsewhere or the log scrolling closes it
	useEffect(() => {
		if (!open) return;
		const away = (e: Event) => {
			const target = e.target as Node;
			if (!card.current?.contains(target) && !button.current?.contains(target)) close();
		};
		window.addEventListener('mousedown', away, true);
		window.addEventListener('scroll', away, true);
		window.addEventListener('resize', close);
		return () => {
			window.removeEventListener('mousedown', away, true);
			window.removeEventListener('scroll', away, true);
			window.removeEventListener('resize', close);
		};
	}, [open]);

	if (!user) return null;
	const usable = list.filter(e => emojiUsable(e, user.id));
	const quick = QUICK.map(n => usable.find(e => e.name === n)).filter(e => !!e);
	const shown = all ? search(usable, query) : quick.length ? quick : usable.slice(0, QUICK.length);
	const react = (emojiId: number) => {
		Socket.sendReact(channel, id, emojiId, true);
		close();
	};
	// the search's keys are its own: not the chat's, not the game's
	const keys = (e: React.KeyboardEvent<HTMLInputElement>) => {
		e.stopPropagation();
		if (e.key === 'Escape') close();
		else if (e.key === 'Enter' && shown[0]) react(shown[0].id);
	};

	return (
		<span className={`chat__react ${open ? 'is-open' : ''}`}>
			<button
				ref={button} type="button" className="chat__line-btn" aria-label={t`React`}
				onClick={() => {
					if (open) return close();
					const r = button.current?.getBoundingClientRect();
					if (!r) return;
					const right = window.innerWidth - r.right;
					setAt(r.top < ROOM_ABOVE ? {
						right, top: r.bottom + 6,
					} : {
						right, bottom: window.innerHeight - r.top + 6,
					});
					setOpen(true);
				}}
			><FontAwesomeIcon icon={faFaceSmile} /></button>
			{open && at && createPortal(
				<div
					ref={card} className={`chat__react-card ${all ? 'is-all' : ''}`} style={at}
					onMouseLeave={() => { if (!all) close(); }}
				>
					{all && (
						<input
							className="chat__react-search" autoFocus value={query}
							placeholder={t`Search emoji`}
							onChange={e => setQuery(e.target.value)} onKeyDown={keys}
						/>
					)}
					<span className="chat__react-grid">
						{shown.map(e => (
							<button key={e.id} type="button" onClick={() => react(e.id)}>
								<img src={emojiSrc(e.id)} alt={`:${e.name}:`} loading="lazy" />
							</button>
						))}
						{all && !shown.length && <span className="chat__react-none">{t`No emoji found`}</span>}
						{!all && usable.length > shown.length && (
							<button
								type="button" className="chat__react-more" aria-label={t`More emoji`}
								onClick={() => setAll(true)}
							>
								<FontAwesomeIcon icon={faEllipsis} />
							</button>
						)}
					</span>
				</div>,
				document.body,
			)}
		</span>
	);
}
