/** A shortcode and the emoji it types, Discord / Slack style (`:sob:` → 😭). */
export type Emoji = { name: string, char: string };

/** Up to this many suggestions above the input, like Discord's; any more would
 *  outgrow the chat panel, which clips what sticks out of its top. */
export const EMOJI_SUGGESTIONS = 6;

/** The `:query` being typed at the end of the draft: two characters at least,
 *  so a lone `:` (or a `:)`) doesn't open anything. */
export const emojiQuery = (draft: string): string | undefined =>
	/(?:^|\s):([a-z0-9_+-]{2,})$/i.exec(draft)?.[1]?.toLowerCase();

/** emojibase's codes are hex code points joined by dashes, mostly without the
 *  emoji-presentation selector: an emoji that defaults to text (☀, 🌶, 🕷)
 *  then renders as a plain glyph. Each such one gets the selector back. */
const TEXT_DEFAULT = /^(?=\p{Extended_Pictographic})\P{Emoji_Presentation}$/u;
const toChar = (hex: string): string => {
	const points = hex.split('-').map(h => parseInt(h, 16));
	return points.map((point, i) => {
		const char = String.fromCodePoint(point);
		return TEXT_DEFAULT.test(char) && points[i + 1] !== 0xfe0f ? `${char}\ufe0f` : char;
	}).join('');
};

let loading: Promise<Emoji[]> | undefined;

/** The shortcodes (Slack's set, which Discord's names follow), fetched the first
 *  time someone types a `:` query: ~50 KB the game doesn't need at start. */
export const loadEmoji = (): Promise<Emoji[]> => loading ??= import(
	'emojibase-data/en/shortcodes/iamcal.json'
).then(({ default: codes }) => Object.entries(codes as Record<string, string | string[]>)
	.flatMap(([hex, names]) => [names].flat().map(name => ({
		name, char: toChar(hex),
	})))
	.sort((a, b) => a.name.localeCompare(b.name)))
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
