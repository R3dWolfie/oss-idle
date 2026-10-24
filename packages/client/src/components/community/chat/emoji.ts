import {
	BUILTIN_EMOJI,
	type EmojiSet,
} from './emojiSet';

/** A shortcode and the emoji it types, Discord style (`:sob:` → 😭). */
export type Emoji = { name: string, char: string };

/** Up to this many suggestions above the input, like Discord's; any more would
 *  outgrow the chat panel, which clips what sticks out of its top. */
export const EMOJI_SUGGESTIONS = 6;

/** The `:query` being typed at the end of the draft: two characters at least,
 *  so a lone `:` (or a `:)`) doesn't open anything. */
export const emojiQuery = (draft: string): string | undefined =>
	/(?:^|\s):([a-z0-9_+-]{2,})$/i.exec(draft)?.[1]?.toLowerCase();

/** The set the chat offers: the built-in one, until a custom emote set replaces it
 *  (another `EmojiSet`, from wherever it comes: it only has to resolve here). */
const source = (): Promise<EmojiSet> => Promise.resolve(BUILTIN_EMOJI);

let loading: Promise<Emoji[]> | undefined;

export const loadEmoji = (): Promise<Emoji[]> => loading ??= source()
	.then(set => set.map(([name, char]) => ({
		name, char,
	})).sort((a, b) => a.name.localeCompare(b.name)))
	.catch((e: unknown) => {
		loading = undefined;
		throw e;
	});

/** Names starting with the query first (shortest first, so `:sob` offers 😭
 *  before 😭's longer cousins), then names that only contain it. */
export const matchEmoji = (list: Emoji[], query: string): Emoji[] => {
	const starts = list.filter(e => e.name.startsWith(query));
	const contains = list.filter(e => !e.name.startsWith(query) && e.name.includes(query));
	return [
		...starts.sort((a, b) => a.name.length - b.name.length),
		...contains,
	].slice(0, EMOJI_SUGGESTIONS);
};

/** Typed-out `:name:` codes become their emoji when the line is sent. */
export const replaceShortcodes = (text: string, list: Emoji[]): string => {
	const byName = new Map(list.map(e => [e.name, e.char]));
	return text.replace(
		/:([a-z0-9_+-]+):/gi,
		(code, name: string) => byName.get(name.toLowerCase()) ?? code,
	);
};
