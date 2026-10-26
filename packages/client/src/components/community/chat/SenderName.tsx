import { faHeart } from '@fortawesome/free-solid-svg-icons/faHeart';
import { faUserGroup } from '@fortawesome/free-solid-svg-icons/faUserGroup';
import { faUserPlus } from '@fortawesome/free-solid-svg-icons/faUserPlus';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import {
	useEffect,
	useLayoutEffect,
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

import { SITE_URL } from '../../../globals';
import Auth from '../../../online/auth';
import {
	addFriend,
	friends,
	mutuals,
} from '../../../online/friends';
import { getCharacter } from '../../../online/services/characters';
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
const CARD_W = 360, CARD_H = 112, GAP = 6, EDGE = 8;

/** The country's flag, from the site's set (web's Flag, under /web); none when it has no image for it. */
const Flag = ({ country }: { country: string }) => {
	const [failed, setFailed] = useState(false);
	if (!country || failed) return null;
	return (
		<img
			className="name-card__flag"
			src={`${SITE_URL}/web/img/flags/${country.toUpperCase()}.png`}
			alt={country}
			onError={() => setFailed(true)}
		/>
	);
};

/** Round buttons, as osu!'s user panel has them: the heart adds them as a friend (pink once they
 *  are one), the two people light up when they added you back; none on your own card or signed out. */
const FriendButtons = ({ userId }: { userId: number }) => {
	const { t } = useLingui();
	const [user] = useSynced(Auth.user);
	const [friendIds = new Set<number>()] = useSynced(friends);
	const [mutualIds = new Set<number>()] = useSynced(mutuals);
	const [adding, setAdding] = useState(false);
	if (!user || user.id === userId) return null;
	const friend = friendIds.has(userId), mutual = mutualIds.has(userId);
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
		<div className="name-card__buttons">
			{mutual && (
				<span className="name-card__button name-card__button--on" title={t`Mutual friends`}>
					<FontAwesomeIcon icon={faUserGroup} />
				</span>
			)}
			{friend ? (
				<span className="name-card__button name-card__button--on" title={t`Friend`}>
					<FontAwesomeIcon icon={faHeart} />
				</span>
			) : (
				<button
					type="button"
					className="name-card__button"
					title={t`Add friend`}
					disabled={adding}
					onClick={() => void add()}
				>
					<FontAwesomeIcon icon={faUserPlus} />
				</button>
			)}
		</div>
	);
};

// how fast a too-long status line scrolls, in px per second
const MARQUEE_PX_S = 30;

/** One line of text that, when it doesn't fit, scrolls to its end and back instead of being cut. */
const Marquee = ({ text }: { text: string }) => {
	const box = useRef<HTMLDivElement>(null);
	const inner = useRef<HTMLSpanElement>(null);
	const [shift, setShift] = useState(0);
	useLayoutEffect(() => {
		if (box.current && inner.current) {
			setShift(Math.max(0, inner.current.offsetWidth - box.current.clientWidth));
		}
	}, [text]);
	return (
		<div ref={box} className="name-card__marquee">
			<span
				ref={inner}
				className={shift ? 'name-card__marquee--on' : undefined}
				style={shift ? {
					'--shift': `-${shift}px`,
					animationDuration: `${2 + (2 * shift) / MARQUEE_PX_S}s`,
				} as React.CSSProperties : undefined}
			>{text}</span>
		</div>
	);
};

/** A small card for an online player, after osu!'s user panel: their banner behind it (their
 *  avatar, blurred, without one); the avatar big; their name in their chat colour by the friend
 *  buttons; where they're from and their rank; what they're doing, how good they are. */
export const NameCard = ({ p, color, bannerUrl }: {
	p: PresenceEntry,
	color?: string,
	bannerUrl?: string,
}) => {
	const { i18n } = useLingui();
	const tier = rankTier(p.rank, p.rankPercent);
	const pp = Math.round(p.pp).toLocaleString(i18n.locale);
	const playing = p.status === 'playing' && p.nowPlaying;
	return (<>
		<div
			className={bannerUrl ? 'name-card__bg name-card__bg--banner' : 'name-card__bg'}
			style={{ backgroundImage: `url("${bannerUrl ?? p.avatarUrl}")` }}
		/>
		<img className="name-card__avatar" src={p.avatarUrl} alt="" />
		<div className="name-card__body">
			<div className="name-card__top">
				<b className="name-card__name" style={{ color }}>{p.name}</b>
				<FriendButtons userId={p.userId} />
			</div>
			<div className="name-card__where">
				<Flag country={p.country} />
				<span className="name-card__country">{countryName(p.country, i18n.locale)}</span>
				{p.rank ? (
					<span
						className="name-card__rank"
						style={tier ? { backgroundImage: rankTierGradient(tier) } : undefined}
					>#{p.rank.toLocaleString(i18n.locale)}</span>
				) : null}
			</div>
			<div className="name-card__status" data-status={p.status}>
				{playing && <span className="name-card__play">▶</span>}
				<Marquee text={playing || statusName(p.status)} />
			</div>
			<div className="name-card__stats">
				<span><b>{pp}</b>pp</span>
				<span><b>{accuracyText(p.accuracy)}</b></span>
				<span><Trans>Lv<b>{p.level}</b></Trans></span>
			</div>
		</div>
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
	// presence has no banner: the profile has it, asked for once the card first shows (and cached)
	const [banner, setBanner] = useState<{ id: number, url?: string }>();
	const open = !!(card && at);
	const characterId = card?.characterId;
	useEffect(() => {
		if (!open || characterId === undefined || banner?.id === characterId) return;
		getCharacter(characterId)
			.then(c => setBanner({
				id: characterId, url: c.bannerUrl, 
			}))
			.catch((e: unknown) => {
				console.warn('[chat] no banner for the name card', e);
				setBanner({ id: characterId });
			});
	}, [open, characterId, banner?.id]);

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
				style={at}
				onMouseEnter={() => window.clearTimeout(timer.current)}
				onMouseLeave={hide}
			>
				<NameCard
					p={card}
					color={color}
					bannerUrl={banner?.id === card.characterId ? banner.url : undefined}
				/>
			</div>,
			document.body,
		)}
	</>);
}
