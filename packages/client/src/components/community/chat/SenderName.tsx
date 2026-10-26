import {
	useEffect,
	useRef,
	useState,
} from 'react';

import useSynced from '@oss-idle/shared/hooks/useSynced';

import { isCommunityOpen } from '../../../globals';
import { getCharacter } from '../../../online/services/characters';
import Socket from '../../../online/socket';
import {
	menuFor,
	type MenuTarget,
	showChat,
} from '../state';
import NameCardPopup from './NameCardPopup';

const HOVER_MS = 350;
// time to cross the gap onto the card
const LEAVE_MS = 200;
// Chat.css .name-card
const CARD_W = 360, CARD_H = 112, GAP = 6, EDGE = 8;

/** A chat line's sender: a click opens the player menu, resting on it shows their card while they're online. */
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
	// presence has no banner
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
	useEffect(() => {
		if (!at) return;
		const away = (e: Event) => {
			if (!cardRef.current?.contains(e.target as Node)) hide();
		};
		const shown = (on: boolean) => {
			if (!on) hide();
		};
		const stops = [showChat.forceSync(shown), isCommunityOpen.forceSync(shown)];
		window.addEventListener('wheel', away, true);
		window.addEventListener('mousedown', away, true);
		window.addEventListener('scroll', away, true);
		window.addEventListener('resize', hide);
		return () => {
			stops.forEach(stop => stop());
			window.removeEventListener('wheel', away, true);
			window.removeEventListener('mousedown', away, true);
			window.removeEventListener('scroll', away, true);
			window.removeEventListener('resize', hide);
		};
	}, [at]);
	const online = !!card;
	useEffect(() => {
		if (!online) hide();
	}, [online]);
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
		{card && at && (
			<NameCardPopup
				p={card}
				color={color}
				bannerUrl={banner?.id === card.characterId ? banner.url : undefined}
				at={at}
				cardRef={cardRef}
				onMouseEnter={() => window.clearTimeout(timer.current)}
				onMouseLeave={hide}
			/>
		)}
	</>);
}
