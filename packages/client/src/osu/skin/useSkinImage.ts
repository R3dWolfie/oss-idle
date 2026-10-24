import {
	useEffect,
	useState,
} from 'react';
import type Skin from './Skin';

/** One of a skin's images by its key, as a URL once read (`read` reads it the first time). */
export const useSkinImage = (
	skin: Skin, key: string, read: () => Promise<string>,
): string | undefined => {
	const [url, setUrl] = useState(() => skin.imageNow(key));
	useEffect(() => {
		let alive = true;
		setUrl(skin.imageNow(key));
		void read().then(u => { if (alive) setUrl(u); });
		return () => { alive = false; };
	}, [skin, key]);
	return url;
};
