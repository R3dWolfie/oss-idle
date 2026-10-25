import {
	useEffect,
	useRef,
	useState,
} from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFaceSmile } from '@fortawesome/free-solid-svg-icons/faFaceSmile';
import { faEllipsis } from '@fortawesome/free-solid-svg-icons/faEllipsis';
import { t } from '@lingui/core/macro';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import {
	type Emoji,
	emojiUsable,
} from '@oss-idle/shared/community/emoji';
import Socket from '../../../online/socket';
import Auth from '../../../online/auth';
import {
	emoji,
	emojiSrc,
} from '../../../online/emoji';

// the ones a chat reaches for most, first; the rest one click away
const QUICK = ['thumbsup', 'joy', 'sob', 'heart', 'fire', 'skull', 'eyes', 'tada'];
// the full list with its search is about this tall: less room above, and it opens below
const ROOM_ABOVE = 240;

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
	// near the top of the log the card opens downwards, so the tabs don't cut it
	const [below, setBelow] = useState(false);
	const button = useRef<HTMLButtonElement>(null);
	const [user] = useSynced(Auth.user);
	const [{ list }] = useSynced(emoji);
	const card = useRef<HTMLSpanElement>(null);

	const close = () => {
		setOpen(false);
		setAll(false);
		setQuery('');
	};
	// the whole list stays while you type in it; a click anywhere else closes it
	useEffect(() => {
		if (!open) return;
		const outside = (e: MouseEvent) => {
			if (!card.current?.parentElement?.contains(e.target as Node)) close();
		};
		window.addEventListener('mousedown', outside, true);
		return () => window.removeEventListener('mousedown', outside, true);
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
		<span className="chat__react">
			<button
				ref={button} type="button" className="chat__line-btn" title={t`React`}
				onClick={() => {
					if (open) return close();
					const at = button.current?.getBoundingClientRect().top ?? 0;
					const top = button.current?.closest('.chat__log')?.getBoundingClientRect().top ?? 0;
					setBelow(at - top < ROOM_ABOVE);
					setOpen(true);
				}}
			><FontAwesomeIcon icon={faFaceSmile} /></button>
			{open && (
				<span
					ref={card} className={`chat__react-card ${all ? 'is-all' : ''} ${below ? 'is-below' : ''}`}
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
							<button key={e.id} type="button" title={`:${e.name}:`} onClick={() => react(e.id)}>
								<img src={emojiSrc(e.id)} alt={`:${e.name}:`} loading="lazy" />
							</button>
						))}
						{all && !shown.length && <span className="chat__react-none">{t`No emoji found`}</span>}
						{!all && usable.length > shown.length && (
							<button
								type="button" className="chat__react-more" title={t`More emoji`}
								onClick={() => setAll(true)}
							>
								<FontAwesomeIcon icon={faEllipsis} />
							</button>
						)}
					</span>
				</span>
			)}
		</span>
	);
}
