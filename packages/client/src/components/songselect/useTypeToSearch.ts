import {
	useEffect,
	type RefObject,
} from 'react';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import { SETTINGS } from '../../db/settings';
import { modSelectOpen } from '../mods/modSelectOpen';

const typing = (key: KeyboardEvent) =>
	key.key.length === 1 && !key.ctrlKey && !key.metaKey && !key.altKey;

/** osu!-style "type anywhere to search": a printable key focuses the box (and
 *  flows into it), Escape clears it. Not while an overlay (the card menu, the playlist
 *  manager, mod select) owns the keyboard: Escape closes it instead, and typing
 *  must not steal focus from it. */
export default function useTypeToSearch(
	searchRef: RefObject<HTMLInputElement | null>,
	search: string,
	overlays: unknown[],
) {
	const [modsOpen] = useSynced(modSelectOpen);
	const blocked = modsOpen || overlays.some(Boolean);
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const el = searchRef.current;
			if (!el || blocked) return;
			if (e.key === 'Escape') {
				if (document.activeElement === el || search) {
					SETTINGS.search.set('');
					el.blur();
					e.preventDefault();
				}
				return;
			}
			const tag = (document.activeElement as HTMLElement | null)?.tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA') return;
			if (typing(e)) el.focus();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [searchRef, search, blocked]);
}
