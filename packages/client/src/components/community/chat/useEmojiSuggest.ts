import {
	type RefObject,
	useEffect,
	useState,
} from 'react';
import {
	type Emoji,
	emojiQuery,
	loadEmoji,
	matchEmoji,
	replaceShortcodes,
} from './emoji';

/** `:sob` at the end of the draft → emoji to pick above the input, Discord
 *  style. Arrows move, Tab or Enter inserts, Esc hides it until the draft
 *  changes; a typed-out `:sob:` becomes 😭 on send (`expand`). */
export default function useEmojiSuggest(
	draft: string,
	setDraft: (draft: string) => void,
	inputRef: RefObject<HTMLInputElement>,
) {
	const [emoji, setEmoji] = useState<Emoji[]>();
	const [picked, setPicked] = useState(0);
	const [dismissed, setDismissed] = useState<string>();
	const query = emojiQuery(draft);
	const suggestions = query && emoji && dismissed !== draft ? matchEmoji(emoji, query) : [];

	useEffect(() => {
		if (query && !emoji) loadEmoji().then(setEmoji, () => {});
	}, [query, emoji]);
	useEffect(() => setPicked(0), [query]);

	const insert = (pick: Emoji) => {
		setDraft(draft.slice(0, draft.length - (query?.length ?? 0) - 1) + pick.char + ' ');
		inputRef.current?.focus();
	};

	/** Handles the key if the suggestions are open; true when it did. */
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
		// the game's own Escape (Controls) closes the chat, or goes back a screen
		e.stopPropagation();
		return true;
	};

	/** The line with its `:codes:` as emoji; loads them first if nothing was
	 *  typed that did (a pasted line), and sends it unchanged if that fails. */
	const expand = async (text: string): Promise<string> => {
		if (!/:[a-z0-9_+-]+:/i.test(text)) return text;
		const list = emoji ?? await loadEmoji().catch(() => undefined);
		return list ? replaceShortcodes(text, list) : text;
	};

	return {
		query, suggestions, picked, setPicked, insert, onKeyDown, expand,
	};
}
