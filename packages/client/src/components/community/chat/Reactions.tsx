import { t } from '@lingui/core/macro';

import type { Reactions as LineReactions } from '@oss-idle/shared/community/reactions';
import useSynced from '@oss-idle/shared/hooks/useSynced';

import Auth from '../../../online/auth';
import { emoji } from '../../../online/emoji';
import Socket from '../../../online/socket';
import ReactionChip from './ReactionChip';

/** Under a line: each emoji people reacted with and how many, yours lit; a click puts yours on or
 *  off. Hovering one names who (the online ones by name). Guests see them and can't click. */
export default function Reactions({ channel, id, reactions }: {
	channel: string,
	id: string,
	reactions?: LineReactions,
}) {
	const [user] = useSynced(Auth.user);
	const [presence = []] = useSynced(Socket.presence);
	const [{ list }] = useSynced(emoji);
	const entries = Object.entries(reactions ?? {}).filter(([, who]) => who.length);
	if (!entries.length) return null;
	const names = new Map(presence.map(p => [p.userId, p.name]));
	const byId = new Map(list.map(e => [String(e.id), e]));
	return (
		<span className="chat__reactions">
			{entries.map(([key, who]) => {
				// a deleted or replaced emoji has no image left
				const e = byId.get(key);
				if (!e) return undefined;
				const mine = !!user && who.includes(user.id);
				const known = who.map(u => names.get(u)).filter(Boolean);
				const others = who.length - known.length;
				return (
					<ReactionChip
						key={key} emoji={e} count={who.length} mine={mine} disabled={!user}
						names={[...known, ...others ? [t`${others} more`] : []].join(', ')}
						onClick={() => Socket.sendReact(channel, id, e.id, !mine)}
					/>
				);
			})}
		</span>
	);
}
