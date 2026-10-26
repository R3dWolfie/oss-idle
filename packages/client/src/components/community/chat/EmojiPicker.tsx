import {
	type RefObject,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import { createPortal } from 'react-dom';
import { t } from '@lingui/core/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons/faStar';
import { faClock } from '@fortawesome/free-solid-svg-icons/faClock';
import { faUserAstronaut } from '@fortawesome/free-solid-svg-icons/faUserAstronaut';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import {
	type Emoji,
	emojiUsable,
} from '@oss-idle/shared/community/emoji';
import Auth from '../../../online/auth';
import {
	emoji,
	emojiSrc,
} from '../../../online/emoji';
import {
	EMOJI_GROUPS,
	groupOf,
} from './emojiGroups';
import {
	emojiUses,
	favoriteEmoji,
	frequentIds,
	noteUse,
	toggleFavorite,
} from './emojiPrefs';

type Section = { key: string, title: string, tab: React.ReactNode, list: Emoji[] };

// one picker open at a time: opening another closes this one
let closeOpen: (() => void) | undefined;

const GROUP_TITLES = (): Record<string, string> => ({
	people: t`People`,
	nature: t`Nature`,
	food: t`Food`,
	activities: t`Activities`,
	travel: t`Travel`,
	objects: t`Objects`,
	symbols: t`Symbols`,
});

/** Every emoji whose name has `query`: the ones it starts first. */
const search = (list: readonly Emoji[], query: string): Emoji[] => {
	const q = query.trim().toLowerCase().replace(/^:|:$/g, '');
	return [
		...list.filter(e => e.name.startsWith(q)),
		...list.filter(e => !e.name.startsWith(q) && e.name.includes(q)),
	];
};

/**
 * The chat's emoji picker, for reacting and for writing: a search on top, then your favourites (a
 * right-click stars one), what you use most, the supporters' own, and every group, with tabs that jump
 * to each; the one under the pointer shows big at the bottom. Enter takes the first match, Esc closes.
 */
export default function EmojiPicker({ anchor, align = 'start', onPick, onClose }: {
	/** what opened it: it sits above that (below, when there's no room), inside the window */
	anchor: RefObject<HTMLElement>,
	/** its left edge on the anchor's, or its right edge on the anchor's */
	align?: 'start' | 'end',
	onPick: (e: Emoji) => void,
	onClose: () => void,
}) {
	const [query, setQuery] = useState('');
	const [hovered, setHovered] = useState<Emoji>();
	const [user] = useSynced(Auth.user);
	const [{ list }] = useSynced(emoji);
	const [favorites] = useSynced(favoriteEmoji);
	const [uses] = useSynced(emojiUses);
	const body = useRef<HTMLDivElement>(null);
	const card = useRef<HTMLDivElement>(null);
	const [place, setPlace] = useState<{ left: number, top: number }>();

	// on the page itself (the chat panel would cut it): placed by its anchor, kept in the window
	useLayoutEffect(() => {
		const put = () => {
			const a = anchor.current?.getBoundingClientRect();
			const own = card.current?.getBoundingClientRect();
			if (!a || !own) return;
			const gap = 4, edge = 8;
			const above = a.top - own.height - gap;
			const below = Math.min(a.bottom + gap, window.innerHeight - own.height - edge);
			const top = above >= edge ? above : below;
			const x = align === 'end' ? a.right - own.width : a.left;
			setPlace({
				left: Math.max(edge, Math.min(x, window.innerWidth - own.width - edge)), top: Math.max(edge, top),
			});
		};
		put();
		window.addEventListener('resize', put);
		closeOpen?.();
		closeOpen = onClose;
		return () => {
			window.removeEventListener('resize', put);
			if (closeOpen === onClose) closeOpen = undefined;
		};
	}, []);

	const usable = list.filter(e => emojiUsable(e, user?.id));
	const byId = new Map(usable.map(e => [e.id, e]));
	const pick = (e: Emoji) => {
		noteUse(e.id);
		onPick(e);
	};

	const titles = GROUP_TITLES();
	const sections: Section[] = query.trim()
		? [{
			key: 'results', title: t`Results`, tab: null, list: search(usable, query),
		}]
		: [
			{
				key: 'favorites', title: t`Favourites`, tab: <FontAwesomeIcon icon={faStar} />,
				list: favorites.map(id => byId.get(id)).filter(e => !!e),
			},
			{
				key: 'frequent', title: t`Frequently used`, tab: <FontAwesomeIcon icon={faClock} />,
				list: frequentIds(uses).map(id => byId.get(id)).filter(e => !!e),
			},
			{
				key: 'supporters', title: t`Supporters'`, tab: <FontAwesomeIcon icon={faUserAstronaut} />,
				list: usable.filter(e => e.owner),
			},
			...EMOJI_GROUPS.map(g => {
				const icon = usable.find(e => e.name === g.icon);
				return {
					key: g.key, title: titles[g.key]!,
					tab: icon ? <img src={emojiSrc(icon.id)} alt="" /> : g.key[0],
					list: g.names.map(n => usable.find(e => e.name === n)).filter(e => !!e),
				};
			}),
			{
				key: 'other', title: t`Other`, tab: null,
				list: usable.filter(e => !e.owner && !groupOf(e.name)),
			},
		];
	const shown = sections.filter(s => s.list.length);

	const jump = (key: string) => {
		const el = body.current?.querySelector<HTMLElement>(`[data-section="${key}"]`);
		if (el && body.current) body.current.scrollTop = el.offsetTop - body.current.offsetTop;
	};
	// the search's keys are its own: not the chat's, not the game's
	const keys = (e: React.KeyboardEvent<HTMLInputElement>) => {
		e.stopPropagation();
		if (e.key === 'Escape') onClose();
		else if (e.key === 'Enter') {
			e.preventDefault();
			const first = shown[0]?.list[0];
			if (first) pick(first);
		}
	};

	const preview = hovered ?? shown[0]?.list[0];
	return createPortal(
		<div
			ref={card} className="emoji-picker" onMouseDown={e => e.stopPropagation()}
			style={place ?? { visibility: 'hidden' }}
		>
			<input
				className="emoji-picker__search" autoFocus value={query}
				placeholder={t`Search emoji`}
				onChange={e => setQuery(e.target.value)} onKeyDown={keys}
			/>
			{!query.trim() && (
				<div className="emoji-picker__tabs">
					{shown.filter(s => s.tab).map(s => (
						<button key={s.key} type="button" title={s.title} onClick={() => jump(s.key)}>{s.tab}</button>
					))}
				</div>
			)}
			<div className="emoji-picker__body" ref={body}>
				{shown.map(s => (
					<section key={s.key} data-section={s.key}>
						<h4>{s.title}</h4>
						<div className="emoji-picker__grid">
							{s.list.map(e => (
								<button
									key={`${s.key}.${e.id}`} type="button"
									className={favorites.includes(e.id) ? 'is-favorite' : undefined}
									onClick={() => pick(e)}
									onContextMenu={ev => {
										ev.preventDefault();
										toggleFavorite(e.id);
									}}
									onMouseEnter={() => setHovered(e)}
								>
									<img src={emojiSrc(e.id)} alt={`:${e.name}:`} loading="lazy" />
								</button>
							))}
						</div>
					</section>
				))}
				{!shown.length && <div className="emoji-picker__none">{t`No emoji found`}</div>}
			</div>
			{preview && (
				<div className="emoji-picker__preview">
					<img src={emojiSrc(preview.id)} alt="" />
					<span>
						<b>:{preview.name}:</b>
						{preview.owner?.name && <em> {t`by ${preview.owner.name}`}</em>}
					</span>
					<small>
						{favorites.includes(preview.id) ? t`Right-click to unstar` : t`Right-click to star`}
					</small>
				</div>
			)}
		</div>,
		document.body,
	);
}
