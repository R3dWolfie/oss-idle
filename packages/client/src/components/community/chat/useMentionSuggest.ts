import {
	type RefObject,
	useEffect,
	useState,
} from 'react';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import Socket from '../../../online/socket';
import Entities from '../../../entity/entities';
import {
	matchNames,
	mentionQuery,
} from './mentionQuery';

export type MentionSuggestion = { name: string, avatarUrl?: string };

// `@ad` at the end of the draft → online players (and whoever spoke here) to pick above the input
export default function useMentionSuggest(
	draft: string,
	setDraft: (draft: string) => void,
	inputRef: RefObject<HTMLInputElement>,
	lines: readonly { name?: string, fromId?: number }[],
) {
	const [picked, setPicked] = useState(0);
	const [dismissed, setDismissed] = useState<string>();
	const [presence = []] = useSynced(Socket.presence);
	const [character] = useSynced(Entities.character);
	const query = mentionQuery(draft);

	const avatars = new Map(presence.map(p => [p.name, p.avatarUrl]));
	// who spoke here (players, not system lines), newest first
	const speakers = lines.filter(l => l.fromId !== undefined && l.name).map(l => l.name!).reverse();
	// who's talking here first (newest first), then everyone else online by name; never yourself
	const online = presence.map(p => p.name).sort((a, b) => a.localeCompare(b));
	const names = [...new Set([...speakers, ...online])].filter(n => n && n !== character.name);
	const open = query !== undefined && dismissed !== draft;
	const suggestions: MentionSuggestion[] = open
		? matchNames(names, query).map(name => ({
			name, avatarUrl: avatars.get(name),
		}))
		: [];

	useEffect(() => setPicked(0), [query]);

	const insert = (pick: MentionSuggestion) => {
		setDraft(draft.slice(0, draft.length - (query?.length ?? 0) - 1) + `@${pick.name} `);
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
