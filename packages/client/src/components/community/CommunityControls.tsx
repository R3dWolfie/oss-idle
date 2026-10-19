import './CommunityControls.css';
import {
	useEffect,
	useRef,
} from 'react';
import { useLingui } from '@lingui/react/macro';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import { isCommunityOpen } from '../../globals';
import CommunityToggle from './CommunityToggle';
import {
	autoHide,
	showChat,
	showTicker,
	showUsers,
} from './state';
import Controls from '../../input/Controls';
import { chatUnread } from './chat/unread';

/**
 * The bottom-right control strip, present open or closed. Mirrors osu!stable's
 * chat buttons: ticker / auto-hide / online-users toggles plus show-hide chat.
 */
export default function CommunityControls() {
	const { t } = useLingui();
	const [open] = useSynced(isCommunityOpen);
	const [chat] = useSynced(showChat);
	const [unread] = useSynced(chatUnread);
	const ref = useRef<HTMLDivElement>(null);

	// the chat input reserves this space so typed text isn't hidden under the buttons
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const root = document.documentElement.style;
		const ro = new ResizeObserver(() => {
			root.setProperty('--community-controls-width', `${el.offsetWidth}px`);
			root.setProperty('--community-controls-height', `${el.offsetHeight}px`);
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const toggleCommunity = () => {
		const current = showUsers.get();
		const isOpen = isCommunityOpen.get();
		// if overlay is open and state is on, only set to false
		if (isOpen) {
			showUsers.set(!current);
			return;
		}
		// if overlay is closed and state is off, open everything
		if (!isOpen && !current) {
			isCommunityOpen.set(true);
			showChat.set(true);
			showUsers.set(true);
		}
	};

	const toggleChat = () => {
		const isOpen = isCommunityOpen.get();
		isCommunityOpen.set(!isOpen);
		showChat.set(!isOpen);
		if (isOpen) {
			showUsers.set(false);
		}
	};
	
	Controls.chat.usePress(toggleChat);
	Controls.community.usePress(toggleCommunity);
	Controls.back.usePress(() => {
		isCommunityOpen.set(false);
		showChat.set(false);
		showUsers.set(false);
	});

	return (
		<div className="community-controls" ref={ref}>
			{open && (<>
				<CommunityToggle value={showTicker} label={t`Show ticker`} />
				<CommunityToggle value={autoHide} label={t`Auto-hide`} />
			</>)}
			<CommunityToggle 
				value={showUsers}
				label={t`Online users`} 
				onClick={toggleCommunity}
			/>
			<CommunityToggle
				value={showChat}
				label={chat ? t`Hide chat` : t`Show chat`}
				onClick={toggleChat}
				unread={unread}
			/>
		</div>
	);
}
