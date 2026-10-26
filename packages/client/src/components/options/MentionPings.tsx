import { Trans } from '@lingui/react/macro';

import useSynced from '@oss-idle/shared/hooks/useSynced';

import Auth from '../../online/auth';
import {
	askNotifyPermission,
	mentionNotify,
	mentionSound,
} from '../community/chat/mentions';
import Checkbox from './controls/Checkbox';

/** How a mention reaches you: a ping, and a desktop notification while the game is behind. */
export default function MentionPings() {
	const [user] = useSynced(Auth.user);
	if (!user) return <></>;
	return <>
		<Checkbox value={mentionSound} label={<Trans>Ping when someone mentions you</Trans>} />
		<Checkbox
			value={mentionNotify}
			// the click is the one moment a browser lets the game ask; refused, it unticks
			onChange={on => {
				if (on) void askNotifyPermission().then(ok => { if (!ok) void mentionNotify.set(false); });
			}}
			label={<Trans>Desktop notification for mentions while the game is in the background</Trans>}
		/>
	</>;
}
