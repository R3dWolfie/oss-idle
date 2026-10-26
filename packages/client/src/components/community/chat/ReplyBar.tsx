import { t } from '@lingui/core/macro';
import {
	type RefObject,
	useLayoutEffect,
	useRef,
} from 'react';

import { atLeft } from './MentionSuggestions';
import type { ReplyTarget } from './replies';

/** Above the input while answering a line, following what you type: a small card with who and a taste of
 *  what they said, in their colour, and the ✕ to drop it (Esc too). */
export default function ReplyBar({
	target, onCancel, inputRef, draft,
}: {
	target: ReplyTarget | undefined,
	onCancel: () => void,
	inputRef: RefObject<HTMLInputElement>,
	draft: string,
}) {
	const ref = useRef<HTMLDivElement>(null);
	// over the caret, as the draft changes; its own width keeps it on the row
	useLayoutEffect(() => {
		const bar = ref.current, input = inputRef.current;
		if (!bar || !input) return;
		const left = atLeft(input, draft.slice(0, input.selectionStart ?? draft.length), bar.offsetWidth);
		if (left !== undefined) bar.style.left = `${left}px`;
	});
	if (!target) return null;
	return (
		<div
			ref={ref} className="chat__replybar"
			style={target.color ? { borderLeftColor: target.color } : undefined}
		>
			<span className="chat__replybar-text">
				↩ <b style={{ color: target.color }}>{target.name}</b> {target.text}
			</span>
			<button
				type="button" aria-label={t`Cancel the reply`}
				onMouseDown={e => e.preventDefault()} onClick={onCancel}
			>✕</button>
		</div>
	);
}
