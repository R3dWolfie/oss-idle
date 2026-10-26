import { t } from '@lingui/core/macro';

import { parseReply } from './replies';
import type useReply from './useReply';

/** Over a reply: who it answers and what they said, joined to the line by a thin curve. The line it
 *  answers lends its colour and its whole text (cut at the edge) when it's still in the log; clicking
 *  goes to it. */
export default function ReplyRef({ text, reply }: {
	text: string,
	reply: ReturnType<typeof useReply>,
}) {
	const to = parseReply(text);
	if (!to) return null;
	const quoted = reply.quoted(to);
	return (
		<button
			type="button" className="chat__reply-ref"
			title={quoted ? t`Go to the message` : undefined}
			disabled={!quoted}
			onClick={() => reply.jump(to)}
		>
			<b style={{ color: quoted?.color }}>{to.name}</b>
			<span>{quoted ? parseReply(quoted.text)?.body ?? quoted.text : to.snippet}</span>
		</button>
	);
}
