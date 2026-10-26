import { Setting } from '../../../db/settings';
import type { ChatMedia } from './media';

/** GIFs and pictures in chat shown as themselves (off: as their links). */
export const showMedia = new Setting('chat.showMedia', true);
/** The GIFs you starred in chat, newest first, for the picker's GIF tab. On this device. */
export const gifFavorites = new Setting<ChatMedia[]>('chat.gifFavorites', []);

// a long scroll of them is no favourites list
const KEPT_GIFS = 100;

/** Star a GIF, or take its star off. */
export const toggleGif = (media: ChatMedia): void => {
	const now = gifFavorites.get();
	void gifFavorites.set(now.some(g => g.src === media.src)
		? now.filter(g => g.src !== media.src)
		: [media, ...now].slice(0, KEPT_GIFS));
};
