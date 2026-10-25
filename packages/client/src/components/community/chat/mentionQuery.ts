// more would stick out of the top of the chat panel
export const MENTION_SUGGESTIONS = 6;

// the `@query` at the end of the draft: open from the bare `@`, so the list shows before a letter is typed
export const mentionQuery = (draft: string): string | undefined =>
	/(?:^|\s)@([^\s@]*)$/.exec(draft)?.[1];

/** The names that `prefix` starts, any case, in the order given (who's talking first). */
export const namesStarting = (names: readonly string[], prefix: string): string[] => {
	const p = prefix.toLowerCase();
	return names.filter(n => n.toLowerCase().startsWith(p));
};

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `@Name` for any of `names` (longest first, so "R3D" doesn't cut "R3DWolfie" short), as a whole word. */
export const mentionPattern = (names: readonly string[]): RegExp | undefined => {
	const list = [...new Set(names.filter(Boolean))].sort((a, b) => b.length - a.length);
	return list.length ? new RegExp(`@(?:${list.map(escape).join('|')})(?![\\w])`, 'gi') : undefined;
};
