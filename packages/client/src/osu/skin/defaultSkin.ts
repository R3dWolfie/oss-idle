import { normalizePath } from '@oss-idle/shared/osuSkin/files';
import type { SkinSource } from './OsuSkin';

/** The default skin's files (packages/client/src/osu/skin/default), by their own names. */
export const DEFAULT_SKIN_FILES: Record<string, string> = Object.fromEntries(Object.entries(
	import.meta.glob('./default/*', {
		query: '?url', import: 'default', eager: true,
	}) as Record<string, string>,
).map(([path, url]) => [path.slice('./default/'.length), url]));

const urls = new Map(Object.entries(DEFAULT_SKIN_FILES)
	.map(([name, url]) => [normalizePath(name), url]));

/** oss!idle's default skin, bundled with the game. */
export const defaultSource = (): SkinSource => ({
	paths: [...urls.keys()],
	read: async path => {
		const url = urls.get(path);
		if (!url) return undefined;
		const res = await fetch(url);
		return res.ok ? res.blob() : undefined;
	},
});
