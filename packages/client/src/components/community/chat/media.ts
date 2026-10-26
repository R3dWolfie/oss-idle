import { splitLinks } from './links';

// GIFs and pictures shown in the chat, from these hosts only: a line can't make every client fetch an
// address of the sender's own (which would hand them everyone's IP). Their own links to their media.
const HOSTS = [
	'media.tenor.com', 'c.tenor.com', 'media1.tenor.com',
	'media.giphy.com', 'i.giphy.com', 'media0.giphy.com', 'media1.giphy.com', 'media2.giphy.com',
	'media3.giphy.com', 'media4.giphy.com',
	'i.imgur.com',
];
const IMAGE = /\.(gif|png|jpe?g|webp)$/i;
const VIDEO = /\.(mp4|webm)$/i;

export type ChatMedia = { url: string, src: string, video: boolean };

/** The GIF or picture a link shows, if it's one from those hosts. Imgur's .gifv is its .mp4. */
export const mediaOf = (url: string): ChatMedia | undefined => {
	let u: URL;
	try {
		u = new URL(url);
	} catch {
		return undefined;
	}
	if (u.protocol !== 'https:' || !HOSTS.includes(u.hostname)) return undefined;
	const path = u.pathname;
	if (u.hostname === 'i.imgur.com' && /\.gifv$/i.test(path)) {
		return {
			url, src: `https://i.imgur.com${path.replace(/\.gifv$/i, '.mp4')}`, video: true,
		};
	}
	if (VIDEO.test(path)) return {
		url, src: u.href, video: true, 
	};
	if (IMAGE.test(path)) return {
		url, src: u.href, video: false, 
	};
	return undefined;
};

/** The media a line's text links to, two at most (a wall of GIFs is no chat). */
export const mediaIn = (text: string): ChatMedia[] => splitLinks(text)
	.flatMap(part => (typeof part !== 'string' && 'url' in part ? [mediaOf(part.url)] : []))
	.filter((m): m is ChatMedia => !!m).slice(0, 2);

/** The line says nothing but one of them: the GIF stands in for its link. */
export const onlyMedia = (text: string): boolean => {
	const t = text.trim();
	return !/\s/.test(t) && mediaIn(t).length === 1;
};
