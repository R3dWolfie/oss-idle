import { Setting } from '../../../db/settings';

/** The emoji you starred (right-click in the picker), in the order you did. On this device. */
export const favoriteEmoji = new Setting<number[]>('chat.emojiFavorites', []);
/** How often you picked each emoji (id → count), for "frequently used". On this device. */
export const emojiUses = new Setting<Record<string, number>>('chat.emojiUses', {});

// kept to the ones that matter, so the count never grows without end
const KEPT_USES = 60;

/** Star an emoji, or take its star off. */
export const toggleFavorite = (id: number): void => {
	const now = favoriteEmoji.get();
	void favoriteEmoji.set(now.includes(id) ? now.filter(f => f !== id) : [...now, id]);
};

/** You picked `id`: one more use. */
export const noteUse = (id: number): void => {
	const now: Record<string, number> = emojiUses.get();
	const uses: Record<string, number> = {
		...now, [id]: (now[id] ?? 0) + 1,
	};
	const kept = Object.entries(uses).sort((a, b) => b[1] - a[1]).slice(0, KEPT_USES);
	void emojiUses.set(Object.fromEntries(kept));
};

export { frequentIds } from './emojiFrequent';
