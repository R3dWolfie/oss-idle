import { Trans } from '@lingui/react/macro';

import useSynced from '@oss-idle/shared/hooks/useSynced';

import { isStandalone } from '../../globals';
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
	// refused once, or a page the browser won't let ask (not https): it never asks again
	const blocked = !isStandalone.get()
		&& (typeof Notification === 'undefined' || Notification.permission === 'denied');
	return <>
		<Checkbox value={mentionSound} label={<Trans>Ping when someone mentions you</Trans>} />
		<Checkbox
			value={mentionNotify}
			disabled={blocked}
			// the click is the one moment a browser lets the game ask; refused, it unticks
			onChange={on => {
				if (on) void askNotifyPermission().then(ok => { if (!ok) void mentionNotify.set(false); });
			}}
			label={<Trans>Desktop notification for mentions while the game is in the background</Trans>}
		/>
		{blocked && (
			<div className="opt-row__hint">
				<Trans>Your browser blocks notifications from oss!idle: allow them in its site settings.</Trans>
			</div>
		)}
	</>;
}
