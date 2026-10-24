import { normalizePath } from '@oss-idle/shared/osuSkin/files';
import type { SkinFile } from '@oss-idle/shared/skin';
import type { SkinSource } from './OsuSkin';
import {
	getManifest,
	getSkinFile,
} from './skinFiles';
import { skinFileUrl } from '../../online/skins';

/** An installed skin's files, or undefined when none are stored for it. */
export const installedSource = async (id: number): Promise<SkinSource | undefined> => {
	const files = await getManifest(id);
	if (!files) return undefined;
	return {
		paths: files.map(f => normalizePath(f.path)),
		read: path => getSkinFile(id, path),
	};
};

/** A catalog skin read straight from the server, one file at a time: only what is shown
 *  is downloaded. */
export const remoteSource = (files: SkinFile[]): SkinSource => {
	const byPath = new Map(files.map(f => [normalizePath(f.path), f]));
	return {
		paths: [...byPath.keys()],
		read: async path => {
			const file = byPath.get(path);
			if (!file?.hash) return undefined;
			const res = await fetch(skinFileUrl(file.hash, file.path));
			return res.ok ? res.blob() : undefined;
		},
	};
};

/** Files picked but not stored yet (an import being published, a replacement upload). */
export const memorySource = (files: Record<string, Blob>): SkinSource => {
	const byPath = new Map(Object.entries(files).map(([path, blob]) => [normalizePath(path), blob]));
	return {
		paths: [...byPath.keys()],
		read: async path => byPath.get(path),
	};
};
