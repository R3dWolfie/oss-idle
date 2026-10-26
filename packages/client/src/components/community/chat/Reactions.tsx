import { t } from '@lingui/core/macro';

import type { Reactions as LineReactions } from '@oss-idle/shared/community/reactions';
import useSynced from '@oss-idle/shared/hooks/useSynced';

import Auth from '../../../online/auth';
import {
	emoji,
	emojiSrc,
} from '../../../online/emoji';
import Socket from '../../../online/socket';

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
				const mine = !!user && who.includes(user.id);
				const known = who.map(u => names.get(u)).filter(Boolean);
				const others = who.length - known.length;
				const title = [...known, ...others ? [t`${others} more`] : []].join(', ');
				const e = byId.get(key);
				return (
					<button
						key={key} type="button" title={title} disabled={!user}
						className={`chat__reaction ${mine ? 'is-mine' : ''}`}
						onClick={() => Socket.sendReact(channel, id, Number(key), !mine)}
					>
						<img src={emojiSrc(Number(key))} alt={e ? `:${e.name}:` : ''} />
						<span>{who.length}</span>
					</button>
				);
			})}
		</span>
	);
}
