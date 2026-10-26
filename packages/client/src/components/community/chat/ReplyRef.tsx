import { t } from '@lingui/core/macro';

import type { ReplyQuote } from '@oss-idle/shared/community/wire';
import useSynced from '@oss-idle/shared/hooks/useSynced';

import { blocked } from '../../../online/blocks';
import type useReply from './useReply';

/** Over a reply: who it answers and what they said, joined to the line by a thin curve; clicking goes to
 *  that line while it's in the log. */
export default function ReplyRef({ to, reply }: {
	to: ReplyQuote | undefined,
	reply: ReturnType<typeof useReply>,
}) {
	const [blockedIds = new Set<number>()] = useSynced(blocked);
	if (!to) return null;
	if (blockedIds.has(to.userId)) {
		return <button type="button" className="chat__reply-ref" disabled><span>{'<block>'}</span></button>;
	}
	const there = reply.inLog(to.id);
	return (
		<button
			type="button" className="chat__reply-ref"
			aria-label={there ? t`Go to the message` : undefined}
			disabled={!there}
			onClick={() => reply.jump(to.id)}
		>
			<b style={{ color: to.color }}>{to.name}</b>
			<span>{to.text}</span>
		</button>
	);
}
