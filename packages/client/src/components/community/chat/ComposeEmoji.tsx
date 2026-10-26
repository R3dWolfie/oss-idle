import {
	type RefObject,
	useEffect,
	useRef,
	useState,
} from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFaceSmile } from '@fortawesome/free-solid-svg-icons/faFaceSmile';
import { t } from '@lingui/core/macro';
import EmojiPicker from './EmojiPicker';

/** The ☺ at the end of the chat input: the emoji picker, putting `:name:` (or a starred GIF's link)
 *  where the cursor is. */
export default function ComposeEmoji({ draft, setDraft, inputRef }: {
	draft: string,
	setDraft: (draft: string) => void,
	inputRef: RefObject<HTMLInputElement>,
}) {
	const [open, setOpen] = useState(false);
	const root = useRef<HTMLSpanElement>(null);
	// where the cursor was when the picker took the focus
	const caret = useRef(0);

	useEffect(() => {
		if (!open) return;
		const outside = (e: MouseEvent) => {
			const at = e.target as Element;
			if (!root.current?.contains(at) && !at.closest?.('.emoji-picker')) setOpen(false);
		};
		window.addEventListener('mousedown', outside, true);
		return () => window.removeEventListener('mousedown', outside, true);
	}, [open]);

	const insert = (text: string) => {
		const at = Math.min(caret.current, draft.length);
		const before = draft.slice(0, at);
		const code = `${before && !before.endsWith(' ') ? ' ' : ''}${text} `;
		setDraft(before + code + draft.slice(at));
		setOpen(false);
		// back to typing, right after it
		requestAnimationFrame(() => {
			const input = inputRef.current;
			if (!input) return;
			input.focus();
			input.setSelectionRange(at + code.length, at + code.length);
		});
	};

	return (
		<span className="chat__compose-emoji" ref={root}>
			<button
				type="button" className="chat__line-btn" title={t`Emoji`}
				onMouseDown={() => { caret.current = inputRef.current?.selectionStart ?? draft.length; }}
				onClick={() => setOpen(!open)}
			><FontAwesomeIcon icon={faFaceSmile} /></button>
			{open && (
				<EmojiPicker
					anchor={root} align="end" onPick={e => insert(`:${e.name}:`)} onPickGif={url => insert(url)}
					onClose={() => setOpen(false)}
				/>
			)}
		</span>
	);
}
