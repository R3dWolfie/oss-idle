import './CommunityOverlay.css';
import {
	useEffect,
	useState,
} from 'react';
import useSynced from '@osu-idle/shared/hooks/useSynced';
import { isCommunityOpen } from '../../globals';
import SceneManager, { SCENE } from '../../scenes/SceneManager';
import CommunityHeader from './CommunityHeader';
import CommunityBody from './CommunityBody';
import PlayerMenu from './PlayerMenu';
import Chat from './chat/Chat';
import CommunityControls from './CommunityControls';
import Ticker from './Ticker';
import {
	autoHide,
	showChat,
	showTicker,
	showUsers,
} from './state';

/**
 * The community overlay (osu!stable's F9): online players, the world map and
 * chat. Mounted once from App and shown/hidden via {@link isCommunityOpen}; no
 * background, just a global dim. F9 toggles it, Esc closes it.
 */
export default function CommunityOverlay() {
	const [visible, setVisible] = useState(false);
	const [open] = useSynced(isCommunityOpen);
	const [chat = true] = useSynced(showChat);
	const [users = true] = useSynced(showUsers);
	const [ticker = true] = useSynced(showTicker);

	// Auto-hide: close during gameplay, reopen afterwards - only if it was open
	// and the toggle is on, so a manual close during play isn't undone.
	useEffect(() => {
		let reopen: { chat: boolean, users: boolean } | undefined;
		void SceneManager.current.sync(scene => {
			if (!autoHide.get()) return;
			if (scene === SCENE.GAME) {
				if (isCommunityOpen.get()) {
					reopen = {
						chat: showChat.get(), users: showUsers.get(),
					};
					// the buttons read these, so they go too
					void isCommunityOpen.set(false);
					void showChat.set(false);
					void showUsers.set(false);
				}
			} else if (reopen) {
				void showChat.set(reopen.chat);
				void showUsers.set(reopen.users);
				void isCommunityOpen.set(true);
				reopen = undefined;
			}
		});
	}, []);
	
	SceneManager.current.use(scene => {
		if (scene === SCENE.INTRO) {
			setVisible(false);
			return;
		}
		setVisible(true);
	});

	if (!visible) return null;

	return (
		<>
			<div className="community">
				<div className={`community-panel ${open && users ? 'is-enabled' : ''}`}>
					<CommunityHeader />
					<CommunityBody />
				</div>
				<div className={`community-chat-container ${open && chat ? 'is-enabled' : ''}`}>
					<Chat />
				</div>
				<PlayerMenu />
			</div>

			{!open && ticker && <Ticker />}
			<CommunityControls />
		</>
	);
}
