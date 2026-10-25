import {
	type RefObject,
	useState,
} from 'react';
import { MAX_CHAT_LENGTH } from '@oss-idle/shared/community/wire';
import {
	type Reply,
	type ReplyTarget,
	findQuoted,
	replyLine,
	replyTo,
} from './replies';

type Line = { id: string, name?: string, fromId?: number, text: string, color?: string };

/** Answering a line: who, the bar above the input, the quote on what you send, and the way back to it. */
export default function useReply(
	lines: readonly Line[],
	logRef: RefObject<HTMLDivElement>,
	inputRef: RefObject<HTMLInputElement>,
) {
	const [target, setTarget] = useState<ReplyTarget>();
	// their name colour in the bar (it stays here, it isn't sent)
	const [color, setColor] = useState<string>();

	const start = (line: Line) => {
		if (!line.name) return;
		setTarget(replyTo({
			id: line.id, name: line.name, text: line.text,
		}));
		setColor(line.color);
		inputRef.current?.focus();
	};
	const cancel = () => setTarget(undefined);

	/** What to send: the quote in front while answering (a /command goes as it is), then done. A message
	 *  the quote would push past the server's limit goes without it rather than not at all. */
	const wrap = (text: string): string => {
		if (!target || text.startsWith('/')) return text;
		setTarget(undefined);
		const line = replyLine(target, text);
		return line.length <= MAX_CHAT_LENGTH ? line : text;
	};

	// Escape with nothing else open drops the reply, the chat stays
	const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): boolean => {
		if (!target || e.key !== 'Escape') return false;
		e.preventDefault();
		e.stopPropagation();
		setTarget(undefined);
		return true;
	};

	/** The answered line, if it's still in the log (for its colour and its text as it is). */
	const quoted = (reply: Reply) => findQuoted(lines, reply);

	/** The answered line, brought into view and lit for a moment. */
	const jump = (reply: Reply) => {
		const hit = quoted(reply);
		const sel = hit && `[data-line="${CSS.escape(hit.id)}"]`;
		const row = sel && logRef.current?.querySelector<HTMLElement>(sel);
		if (!row) return;
		row.scrollIntoView({
			block: 'center', behavior: 'smooth', 
		});
		row.classList.remove('is-flash');
		void row.offsetWidth;
		row.classList.add('is-flash');
	};

	return {
		target, color, start, cancel, wrap, onKeyDown, quoted, jump,
	};
}
