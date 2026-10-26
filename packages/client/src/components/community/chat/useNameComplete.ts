import {
	type RefObject,
	useEffect,
	useRef,
	useState,
} from 'react';

import useSynced from '@oss-idle/shared/hooks/useSynced';

import Entities from '../../../entity/entities';
import Socket from '../../../online/socket';
import {
	MENTION_SUGGESTIONS,
	mentionQuery,
	namesStarting,
} from './mentionQuery';

export type MentionSuggestion = { name: string, avatarUrl?: string };

/**
 * Player names in the chat input, one system for both ways in: Tab completes the word under the
 * cursor (again cycles), and `@` lists the same names above the input to pick from. Who spoke in
 * the channel comes first (newest first), then everyone else online by name; never yourself.
 */
export default function useNameComplete(
	draft: string,
	setDraft: (draft: string) => void,
	inputRef: RefObject<HTMLInputElement>,
	lines: readonly { name?: string, fromId?: number }[],
) {
	const [picked, setPicked] = useState(0);
	const [dismissed, setDismissed] = useState<string>();
	const [presence = []] = useSynced(Socket.presence);
	const [character] = useSynced(Entities.character);
	// Tab's cycle: where the word starts and the names it goes through
	const cycle = useRef<{ start: number, at: string, matches: string[], index: number }>(undefined);

	const speakers = lines.filter(l => l.fromId !== undefined && l.name).map(l => l.name!).reverse();
	const online = presence.map(p => p.name).sort((a, b) => a.localeCompare(b));
	const names = [...new Set([...speakers, ...online])].filter(n => n && n !== character.name);
	const avatars = new Map(presence.map(p => [p.name, p.avatarUrl]));

	const query = mentionQuery(draft);
	const suggestions: MentionSuggestion[] = query !== undefined && dismissed !== draft
		? namesStarting(names, query).slice(0, MENTION_SUGGESTIONS).map(name => ({
			name, avatarUrl: avatars.get(name),
		}))
		: [];

	useEffect(() => setPicked(0), [query]);

	const insert = (pick: MentionSuggestion) => {
		setDraft(draft.slice(0, draft.length - (query?.length ?? 0) - 1) + `@${pick.name} `);
		inputRef.current?.focus();
	};

	// Tab without the list: the word's name, then the next one on each press (an `@` stays in front)
	const tab = () => {
		if (!cycle.current) {
			const start = draft.lastIndexOf(' ') + 1;
			const at = draft[start] === '@' ? '@' : '';
			const prefix = draft.slice(start + at.length);
			const matches = namesStarting(names, prefix);
			if (!prefix || !matches.length) return;
			cycle.current = {
				start, at, matches, index: -1,
			};
		}
		const c = cycle.current;
		c.index = (c.index + 1) % c.matches.length;
		setDraft(draft.slice(0, c.start) + c.at + c.matches[c.index]);
	};

	// true when it took the key
	const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): boolean => {
		const open = suggestions.length > 0;
		const step = open ? {
			ArrowDown: 1, ArrowUp: -1,
		}[e.key] : undefined;
		// the list may have shrunk under the pick
		const pick = suggestions[picked] ?? suggestions[0];
		if (step) setPicked((picked + step + suggestions.length) % suggestions.length);
		else if (open && (e.key === 'Tab' || e.key === 'Enter')) insert(pick);
		else if (open && e.key === 'Escape') setDismissed(draft);
		else if (e.key === 'Tab') tab();
		else return false;
		e.preventDefault();
		// keeps the game's Escape from closing the chat
		e.stopPropagation();
		return true;
	};

	// a typed key ends Tab's cycle
	const typed = () => { cycle.current = undefined; };

	return {
		query, suggestions, picked, setPicked, insert, onKeyDown, typed,
	};
}
