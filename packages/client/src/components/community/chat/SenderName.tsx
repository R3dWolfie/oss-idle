import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import {
	useEffect,
	useRef,
	useState,
} from 'react';
import { createPortal } from 'react-dom';

import type { PresenceEntry } from '@oss-idle/shared/community/presence';
import accuracyText from '@oss-idle/shared/display/accuracy';
import { statusName } from '@oss-idle/shared/display/community';
import { countryName } from '@oss-idle/shared/display/country';
import {
	rankTier,
	rankTierGradient,
} from '@oss-idle/shared/display/rankTier';
import Log from '@oss-idle/shared/helpers/log';
import useSynced from '@oss-idle/shared/hooks/useSynced';

import Auth from '../../../online/auth';
import {
	addFriend,
	friends,
	mutuals,
} from '../../../online/friends';
import Socket from '../../../online/socket';
import {
	menuFor,
	type MenuTarget,
} from '../state';

// how long the pointer rests on a name before its card shows: passing over the log shows nothing
const HOVER_MS = 350;
// how long the card stays once the pointer leaves the name: time to cross the gap onto it
const LEAVE_MS = 200;
// the card's size (Chat.css .name-card), to place it before it's drawn
const CARD_W = 300, CARD_H = 146, GAP = 6, EDGE = 8;

/** Whether they're your friend (and whether they added you back), or a button to add them;
 *  nothing on your own card or signed out. */
const FriendRow = ({ userId }: { userId: number }) => {
	const [user] = useSynced(Auth.user);
	const [friendIds = new Set<number>()] = useSynced(friends);
	const [mutualIds = new Set<number>()] = useSynced(mutuals);
	const [adding, setAdding] = useState(false);
	if (!user || user.id === userId) return null;
	if (mutualIds.has(userId)) {
		return (
			<div className="name-card__friend" data-friend="mutual"><Trans>⇄ Mutual friends</Trans></div>
		);
	}
	if (friendIds.has(userId)) {
		return <div className="name-card__friend" data-friend="friend"><Trans>✓ Friend</Trans></div>;
	}
	const add = async () => {
		setAdding(true);
		try {
			await addFriend(userId);
		} catch (e) {
			Log.errorPopup(String(e));
		} finally {
			setAdding(false);
		}
	};
	return (
		<div className="name-card__friend">
			<button type="button" disabled={adding} onClick={() => void add()}>
				<Trans>+ Add friend</Trans>
			</button>
		</div>
	);
};

/** A small card for an online player, in their chat colour: who, how good, what they're doing. */
const NameCard = ({ p, color }: { p: PresenceEntry, color?: string }) => {
	const { i18n } = useLingui();
	const tier = rankTier(p.rank, p.rankPercent);
	const pp = Math.round(p.pp).toLocaleString(i18n.locale);
	const accuracy = accuracyText(p.accuracy);
	const level = p.level;
	return (<>
		<div className="name-card__head">
			<img src={p.avatarUrl} alt="" />
			<div className="name-card__who">
				<b style={{ color }}>{p.name}</b>
				<small>{countryName(p.country, i18n.locale)}</small>
			</div>
			{p.rank ? (
				<span
					className="name-card__rank"
					style={tier ? { backgroundImage: rankTierGradient(tier) } : undefined}
				>#{p.rank.toLocaleString(i18n.locale)}</span>
			) : null}
		</div>
		<div className="name-card__stats">
			<span><b>{pp}</b>pp</span>
			<span><b>{accuracy}</b></span>
			<span><Trans>Lv<b>{level}</b></Trans></span>
		</div>
		<div className="name-card__status" data-status={p.status}>
			{p.status === 'playing' && p.nowPlaying ? `▶ ${p.nowPlaying}` : statusName(p.status)}
		</div>
		<FriendRow userId={p.userId} />
	</>);
};

/**
 * A chat line's sender: a click opens the player menu, resting on it shows a small card (rank, pp,
 * accuracy, level, what they're playing, whether they're a friend) above the name. The card stays
 * while the pointer is on it, so its button can be used. Someone who went offline since has none.
 */
export default function SenderName({ sender, name, color }: {
	sender?: MenuTarget,
	name: string,
	color?: string,
}) {
	const [roster = []] = useSynced(Socket.presence);
	const [at, setAt] = useState<{ left: number, top: number }>();
	const timer = useRef<number>(undefined);
	const cardRef = useRef<HTMLDivElement>(null);
	const card = sender && roster.find(p => p.characterId === sender.characterId);

	const hide = () => {
		window.clearTimeout(timer.current);
		setAt(undefined);
	};
	const leave = () => {
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => setAt(undefined), LEAVE_MS);
	};
	// the log scrolling or a click elsewhere takes it away (a click on the card itself is its own)
	useEffect(() => {
		if (!at) return;
		const away = (e: Event) => {
			if (!cardRef.current?.contains(e.target as Node)) hide();
		};
		window.addEventListener('wheel', away, true);
		window.addEventListener('mousedown', away, true);
		return () => {
			window.removeEventListener('wheel', away, true);
			window.removeEventListener('mousedown', away, true);
		};
	}, [at]);
	useEffect(() => () => window.clearTimeout(timer.current), []);

	const show = (el: HTMLElement) => {
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => {
			const r = el.getBoundingClientRect();
			const top = r.top - CARD_H - GAP >= EDGE ? r.top - CARD_H - GAP : r.bottom + GAP;
			setAt({
				left: Math.max(EDGE, Math.min(r.left, window.innerWidth - CARD_W - EDGE)), top,
			});
		}, HOVER_MS);
	};

	if (!sender) return <span>{name}</span>;
	return (<>
		<span
			className="chat__name"
			onMouseEnter={e => card && show(e.currentTarget)}
			onMouseLeave={leave}
			onClick={e => {
				e.stopPropagation();
				hide();
				void menuFor.set({ ...sender });
			}}
		>{name}</span>
		{card && at && createPortal(
			<div
				ref={cardRef}
				className="name-card"
				style={{
					...at, borderColor: color,
				}}
				onMouseEnter={() => window.clearTimeout(timer.current)}
				onMouseLeave={hide}
			>
				<NameCard p={card} color={color} />
			</div>,
			document.body,
		)}
	</>);
}
