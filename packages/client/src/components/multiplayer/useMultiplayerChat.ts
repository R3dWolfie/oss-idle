import { useEffect } from 'react';
import { isCommunityOpen } from '../../globals';
import {
	showChat,
	showUsers,
} from '../community/state';

/** osu! shows the chat under the lobby and the match setup. */
export default function useMultiplayerChat(): void {
	useEffect(() => {
		const wasOpen = isCommunityOpen.get();
		void showChat.set(true);
		void showUsers.set(false);
		void isCommunityOpen.set(true);
		return () => { void isCommunityOpen.set(wasOpen); };
	}, []);
}
