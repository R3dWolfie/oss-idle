import { useState } from 'react';
import { createPortal } from 'react-dom';

import type { Emoji } from '@oss-idle/shared/community/emoji';

import { emojiSrc } from '../../../online/emoji';

/** One emoji under a line and how many reacted with it, yours lit; hovered, who. */
export default function ReactionChip({ emoji, count, names, mine, disabled, onClick }: {
	emoji: Emoji,
	count: number,
	names: string,
	mine: boolean,
	disabled: boolean,
	onClick: () => void,
}) {
	const [at, setAt] = useState<DOMRect>();
	return <>
		<button
			type="button" disabled={disabled}
			className={`chat__reaction ${mine ? 'is-mine' : ''}`}
			onClick={onClick}
			onMouseEnter={e => setAt(e.currentTarget.getBoundingClientRect())}
			onMouseLeave={() => setAt(undefined)}
		>
			<img src={emojiSrc(emoji.id)} alt={`:${emoji.name}:`} />
			<span>{count}</span>
		</button>
		{at && createPortal(
			<div className="chat__emoji-tooltip" style={{
				left: at.left + at.width / 2, top: at.top,
			}}>
				<span>:{emoji.name}:</span>
				<span className="chat__emoji-tooltip-owner">{names}</span>
			</div>,
			document.body,
		)}
	</>;
}
