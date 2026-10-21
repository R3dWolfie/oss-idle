import './audio/musicSpeed';
import Popups from './components/Popups';
import Cursor from './components/Cursor';
import SceneManager from './scenes/SceneManager';
import TransitionOverlay from './scenes/Transition';
import VolumeOverlay from './components/VolumeOverlay';
import RestrictedNotice from './components/RestrictedNotice';
import WebBrowser from './components/WebBrowser';
import Onboarding from './components/Onboarding';
import Tutorial from './components/Tutorial';
import OldHostPrompt from './components/OldHostPrompt';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import { isMobile } from './globals';
import Message from './components/Message';
import Options from './scenes/Options';
import FpsCounter from './components/FpsCounter';
import PlayManager from './online/playManager';
import Presence from './online/presence';
import Socket from './online/socket';
import CommunityOverlay from './components/community/CommunityOverlay';
import PageOverlay from './components/page/PageOverlay';
import PlayDock from './components/dock/PlayDock';
import Playground from './dev/Playground';
import {
	DEV_TOOLS,
	devTools,
} from './dev/devTools';
import FloatingDeltas from './components/FloatingDeltas';
import ShownMedals from './components/medals/ShownMedals';
import './online/versionWatch';
import './online/characterWatch';
import './online/mapLinks';
import Multiplayer from './online/multiplayer';

PlayManager.start();
Presence.start();
Socket.start();
Multiplayer.start();

/** Dev-only component bench; see dev/Playground.tsx. Checked once at load so a
 *  release build drops the whole tree. Dev opens it with `?playground`, staging
 *  from its startup menu. */
const playground = DEV_TOOLS && (import.meta.env.DEV
	? new URLSearchParams(location.search).has('playground')
	: devTools.playground);

export default function App() {
	const [scene] = useSynced(SceneManager.scene);

	if (playground) return <Playground />;

	return (
		<>
			<RestrictedNotice />
			{scene}
			<PageOverlay />
			<PlayDock />
			<TransitionOverlay />
			<VolumeOverlay />
			<Onboarding />
			<Tutorial />
			<OldHostPrompt />
			<Message />
			<Options />
			<WebBrowser />
			<CommunityOverlay />
			<FloatingDeltas />
			<ShownMedals />
			<Popups />
			<FpsCounter />
			{!isMobile && <Cursor />}
		</>
	);
}
