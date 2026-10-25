import { BUILTIN_EMOJI } from './emojiSet';

export type Emoji = { name: string, char: string };

// more would stick out of the top of the chat panel
const EMOJI_SUGGESTIONS = 6;

const EMOJI: Emoji[] = BUILTIN_EMOJI
	.map(([name, char]) => ({
		name, char,
	}))
	.sort((a, b) => a.name.localeCompare(b.name));
const BY_NAME = new Map(BUILTIN_EMOJI);

// the `:query` at the end of the draft, two characters at least
export const emojiQuery = (draft: string): string | undefined =>
	/(?:^|\s):([a-z0-9_+-]{2,})$/i.exec(draft)?.[1]?.toLowerCase();

// names starting with the query (shortest first), then names containing it
export const matchEmoji = (query: string): Emoji[] => {
	const starts = EMOJI.filter(e => e.name.startsWith(query));
	const contains = EMOJI.filter(e => !e.name.startsWith(query) && e.name.includes(query));
	return [
		...starts.sort((a, b) => a.name.length - b.name.length),
		...contains,
	].slice(0, EMOJI_SUGGESTIONS);
};

export const replaceShortcodes = (text: string): string => text.replace(
	/:([a-z0-9_+-]+):/gi,
	(code, name: string) => BY_NAME.get(name.toLowerCase()) ?? code,
);
