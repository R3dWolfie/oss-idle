import {
	useEffect,
	useState,
} from 'react';

import { getCharacter } from '../../../online/services/characters';

/** A name card's banner (presence has none), read once the card opens. */
export default function useCardBanner(
	characterId: number | undefined, open: boolean,
): string | undefined {
	const [banner, setBanner] = useState<{ id: number, url?: string }>();
	useEffect(() => {
		if (!open || characterId === undefined || banner?.id === characterId) return;
		getCharacter(characterId)
			.then(c => setBanner({
				id: characterId, url: c.bannerUrl,
			}))
			.catch((e: unknown) => {
				console.warn('[chat] no banner for the name card', e);
				setBanner({ id: characterId });
			});
	}, [open, characterId, banner?.id]);
	return banner?.id === characterId ? banner?.url : undefined;
}
