/**
 * How stable finds a skin's files: names are case-insensitive, `\` and `/` are the same
 * separator, an image is a .png (or .jpg) with an optional `@2x` high-resolution twin, an
 * animation is `name-0`, `name-1`, ..., and a sound is a .wav, .ogg or .mp3.
 */

/** What a skin may hold: everything stable reads, plus readmes. */
export const SKIN_FILE_TYPES = ['png', 'jpg', 'jpeg', 'wav', 'ogg', 'mp3', 'ini', 'txt'] as const;

const TYPES = new Set<string>(SKIN_FILE_TYPES);

export const fileType = (path: string): string => {
	const dot = path.lastIndexOf('.');
	return dot < 0 ? '' : path.slice(dot + 1).toLowerCase();
};

/** A catalog skin file's name on the server: its content's hash, its own extension. */
export const skinFileName = (hash: string, path: string) => `${hash}.${fileType(path)}`;

export const isSkinFile = (path: string): boolean => TYPES.has(fileType(path));

/** The key a file is looked up by. */
export const normalizePath = (path: string): string =>
	path.replace(/\\/g, '/').replace(/^(\.\/|\/)+/, '').toLowerCase();

/** An archive's files as a skin folder has them: without macOS's extra copies or folder
 *  entries, and out of the one folder a hand-zipped skin often wraps them in. */
export const unwrapArchive = <T>(files: Record<string, T>): Record<string, T> => {
	const kept = Object.entries(files).filter(([name]) =>
		!name.startsWith('__MACOSX/') && !name.split('/').pop()!.startsWith('._') && !name.endsWith('/'));
	const tops = new Set(kept.map(([name]) => name.split('/')[0]));
	const wrapped = tops.size === 1 && kept.every(([name]) => name.includes('/'));
	return Object.fromEntries(kept.map(([name, data]) =>
		[wrapped ? name.slice(name.indexOf('/') + 1) : name, data]));
};

/** The normalized paths of a skin's files. */
export type SkinIndex = { has: (path: string) => boolean };

export type FoundImage = {
	path: string,
	/** 2 for an @2x file: drawn at half its pixel size */
	density: 1 | 2,
};

const IMAGE_EXTS = ['png', 'jpg'];

/** An image by its stable name (`mania-note1`, or a skin.ini path like `Notes\blue`). */
export const findImage = (index: SkinIndex, name: string): FoundImage | undefined => {
	// stable drops an @2x written into a skin.ini path
	const base = normalizePath(name).replace(/@2x/g, '');
	const ext = fileType(base);
	const stems = ext === 'png' || ext === 'jpg' || ext === 'jpeg'
		? [[base.slice(0, -ext.length - 1), ext]]
		: IMAGE_EXTS.map(e => [base, e]);
	for (const [stem, e] of stems) {
		if (index.has(`${stem}@2x.${e}`)) return {
			path: `${stem}@2x.${e}`, density: 2,
		};
	}
	for (const [stem, e] of stems) {
		if (index.has(`${stem}.${e}`)) return {
			path: `${stem}.${e}`, density: 1,
		};
	}
};

/** An element's animation frames (`name-0`, `name-1`, ...), else its single image, else none. */
export const findFrames = (index: SkinIndex, name: string): FoundImage[] => {
	const frames: FoundImage[] = [];
	for (let i = 0; ; i++) {
		const frame = findImage(index, `${name}-${i}`);
		if (!frame) break;
		frames.push(frame);
	}
	if (frames.length) return frames;
	const single = findImage(index, name);
	return single ? [single] : [];
};

const SOUND_EXTS = ['wav', 'ogg', 'mp3'];

export const findSound = (index: SkinIndex, name: string): string | undefined => {
	const base = normalizePath(name);
	return SOUND_EXTS.map(e => `${base}.${e}`).find(p => index.has(p));
};
