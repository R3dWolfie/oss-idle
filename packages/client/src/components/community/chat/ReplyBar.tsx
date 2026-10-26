import { t } from '@lingui/core/macro';

import type { ReplyTarget } from './replies';

/** Over the start of the input while answering a line: a small card with who and a taste of what they
 *  said, in their colour, and the ✕ to drop it (Esc too). */
export default function ReplyBar({ target, color, onCancel }: {
	target: ReplyTarget | undefined,
	color?: string,
	onCancel: () => void,
}) {
	if (!target) return null;
	return (
		<div className="chat__replybar" style={color ? { borderLeftColor: color } : undefined}>
			<span className="chat__replybar-text">
				↩ <b style={{ color }}>{target.name}</b> {target.snippet}
			</span>
			<button
				type="button" title={t`Cancel the reply`}
				onMouseDown={e => e.preventDefault()} onClick={onCancel}
			>✕</button>
		</div>
	);
}
