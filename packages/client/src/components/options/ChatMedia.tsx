import { Trans } from '@lingui/react/macro';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import Checkbox from './controls/Checkbox';
import {
	showMedia,
	tickerMedia,
} from '../community/chat/gifPrefs';

/** GIFs and pictures in chat shown as themselves, or only as their links; and in the ticker too. */
export default function ChatMedia() {
	const [on] = useSynced(showMedia);
	return <>
		<Checkbox value={showMedia} label={<Trans>Show GIFs and pictures in chat</Trans>} />
		<Checkbox value={tickerMedia} disabled={!on} label={<Trans>Show GIFs in the ticker</Trans>} />
	</>;
}
