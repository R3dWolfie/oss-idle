import './Ticker.css';

import {
	useEffect,
	useRef,
} from 'react';

import clock from '@oss-idle/shared/display/clock';
import useSynced from '@oss-idle/shared/hooks/useSynced';

import { menuIdle } from '../../globals';
import Socket from '../../online/socket';
import ChatText from './chat/ChatText';
import Reactions from './chat/Reactions';
import ChatMediaView from './chat/ChatMediaView';
import {
	showMedia,
	tickerMedia,
} from './chat/gifPrefs';
import { parseReply } from './chat/replies';

/** The latest chat line, shown while the overlay is closed (when enabled). */
export default function Ticker() {
	const [lines = []] = useSynced(Socket.chat);
	const [idle] = useSynced(menuIdle);
	const [media] = useSynced(showMedia);
	// GIFs in the ticker: an option (else a small GIF tag)
	const [inTicker] = useSynced(tickerMedia);
	const latest = lines[lines.length - 1];
	const ref = useRef<HTMLDivElement>(null);

	// pages keep their bottom bar above it (page.css), so Back is never under a line of chat
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const root = document.documentElement.style;
		const ro = new ResizeObserver(() => {
			root.setProperty('--community-ticker-height', `${el.offsetHeight}px`);
		});
		ro.observe(el);
		return () => {
			ro.disconnect();
			root.removeProperty('--community-ticker-height');
		};
	}, [!!latest]);

	if (!latest) return null;
	
	const time = clock(latest.at);

	if (latest.kind === 'system') {
		return (
			<div ref={ref} className={`community-ticker ${idle ? 'is-idle' : ''}`}>
				<div className="chat__line">
					<span className="chat__text" style={{ color: latest.color }}>{time} {latest.text}</span>
				</div>
			</div>
		);
	}

	// a reply says who it answers, small, before what it says
	const reply = parseReply(latest.text);
	return (
		<div ref={ref} className={`community-ticker ${idle ? 'is-idle' : ''}`}>
			<div className="chat__line">
				<span
					className="chat__from"
					style={{ color: latest.from.color }}
				>{`${time} ${latest.from.name}:`}</span>
				<span className="chat__body">
					{reply && <span className="chat__ticker-reply">↩ {reply.name}</span>}
					<ChatText
						text={latest.text} senderId={latest.from.userId}
						media={media && inTicker ? 'hide' : 'label'}
					/>
					{inTicker && <ChatMediaView text={reply?.body ?? latest.text} />}
					<Reactions channel={latest.channel} id={latest.id} reactions={latest.reactions} readOnly />
				</span>
			</div>
		</div>
	);
}
