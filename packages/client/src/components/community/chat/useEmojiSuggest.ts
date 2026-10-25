import {
	type RefObject,
	useEffect,
	useState,
} from 'react';
import {
	type Emoji,
	emojiQuery,
	matchEmoji,
} from './emoji';

// `:sob` at the end of the draft → emoji to pick above the input
export default function useEmojiSuggest(
	draft: string,
	setDraft: (draft: string) => void,
	inputRef: RefObject<HTMLInputElement>,
) {
	const [picked, setPicked] = useState(0);
	const [dismissed, setDismissed] = useState<string>();
	const query = emojiQuery(draft);
	const suggestions = query && dismissed !== draft ? matchEmoji(query) : [];

	useEffect(() => setPicked(0), [query]);

	const insert = (pick: Emoji) => {
		setDraft(draft.slice(0, draft.length - (query?.length ?? 0) - 1) + pick.char + ' ');
		inputRef.current?.focus();
	};

	// true when the open suggestions took the key
	const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): boolean => {
		if (!suggestions.length) return false;
		const step = {
			ArrowDown: 1, ArrowUp: -1,
		}[e.key];
		if (step) setPicked((picked + step + suggestions.length) % suggestions.length);
		else if (e.key === 'Tab' || e.key === 'Enter') insert(suggestions[picked] ?? suggestions[0]);
		else if (e.key === 'Escape') setDismissed(draft);
		else return false;
		e.preventDefault();
		// keeps the game's Escape from closing the chat
		e.stopPropagation();
		return true;
	};

	return {
		query, suggestions, picked, setPicked, insert, onKeyDown,
	};
}
