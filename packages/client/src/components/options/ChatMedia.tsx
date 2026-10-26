import { Trans } from '@lingui/react/macro';
import Checkbox from './controls/Checkbox';
import { showMedia } from '../community/chat/gifPrefs';

/** GIFs and pictures in chat shown as themselves, or only as their links. */
export default function ChatMedia() {
	return <Checkbox value={showMedia} label={<Trans>Show GIFs and pictures in chat</Trans>} />;
}
