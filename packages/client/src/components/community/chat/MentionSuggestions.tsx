import { ph } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { RefObject } from 'react';

import { GUEST_AVATAR_URL } from '@oss-idle/shared/osu/profile';

import type useNameComplete from './useNameComplete';

let measure: CanvasRenderingContext2D | undefined;

/** Where the text after `before` sits in the input, in px from the compose row's left: `before` measured
 *  in the input's own font, less what the input scrolled. Kept inside the row, `room` wide. */
export const atLeft = (
	input: HTMLInputElement | undefined, before: string, room = 248,
): number | undefined => {
	const row = input?.offsetParent ?? undefined;
	if (!input || !row) return undefined;
	measure ??= document.createElement('canvas').getContext('2d') ?? undefined;
	if (!measure) return undefined;
	const style = getComputedStyle(input);
	measure.font = style.font;
	measure.letterSpacing = style.letterSpacing;
	const x = input.offsetLeft + input.clientLeft + parseFloat(style.paddingLeft)
		+ measure.measureText(before).width - input.scrollLeft;
	// what shows there (the list: 240px at least, as the emoji one) stays on the row
	return Math.max(0, Math.min(x, row.clientWidth - room));
};

/** The `@` list, above the `@` it completes: online players (and the channel's speakers) to mention. */
export default function MentionSuggestions({ mention, inputRef, draft }: {
	mention: ReturnType<typeof useNameComplete>,
	inputRef: RefObject<HTMLInputElement>,
	draft: string,
}) {
	if (!mention.suggestions.length) return null;
	const before = draft.slice(0, draft.length - (mention.query?.length ?? 0) - 1);
	const left = atLeft(inputRef.current ?? undefined, before);
	return (
		<div className="chat__emoji" style={left === undefined ? undefined : { left }}>
			<div className="chat__emoji-title">
				{mention.query
					? <Trans>Players matching <b>@{ph({ query: mention.query })}</b></Trans>
					: <Trans>Mention a player</Trans>}
			</div>
			{mention.suggestions.map((s, i) => (
				<button
					key={s.name}
					type="button"
					className={`chat__emoji-option ${i === mention.picked ? 'is-picked' : ''}`}
					onMouseEnter={() => mention.setPicked(i)}
					onMouseDown={e => e.preventDefault()}
					onClick={() => mention.insert(s)}
				>
					<img className="chat__mention-avatar" src={s.avatarUrl ?? GUEST_AVATAR_URL} alt="" />
					{s.name}
				</button>
			))}
		</div>
	);
}
