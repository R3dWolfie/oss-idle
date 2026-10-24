import {
	zip,
	type Zippable,
} from 'fflate';
import {
	fileType,
	normalizePath,
} from '@oss-idle/shared/osuSkin/files';
import type { SkinFile } from '@oss-idle/shared/skin';
import {
	getSkin,
	skinFileUrl,
	type SkinWithFiles,
} from '../../online/skins';
import {
	getManifest,
	getSkinFile,
	putSkinFiles,
} from './skinFiles';
import { DEFAULT_SKIN_FILES } from './defaultSkin';

const PARALLEL = 6;

/** Run `jobs` a few at a time. */
const pool = async (jobs: (() => Promise<void>)[]) => {
	let next = 0;
	await Promise.all(Array.from({ length: PARALLEL }, async () => {
		while (next < jobs.length) await jobs[next++]();
	}));
};

/** Download a catalog skin's files into the installed store: only those it does not hold
 *  yet under the same hash, so an update fetches what changed. */
export const downloadSkin = async (id: number): Promise<SkinWithFiles> => {
	const remote = await getSkin(id);
	const held = new Map((await getManifest(id) ?? []).map(f => [normalizePath(f.path), f.hash]));
	const blobs = new Map<string, Blob>();
	await pool(remote.files
		.filter(f => held.get(normalizePath(f.path)) !== f.hash)
		.map(f => async () => {
			const res = await fetch(skinFileUrl(f.hash, f.path));
			if (!res.ok) throw new Error(`${f.path}: ${res.status}`);
			blobs.set(normalizePath(f.path), await res.blob());
		}));
	await putSkinFiles(id, remote.files, blobs);
	return remote;
};

// already compressed: storing them again costs time for nothing
const STORED = new Set(['png', 'jpg', 'jpeg', 'mp3', 'ogg']);

/** Files packed as an .osk. */
type Packed = { path: string, read: () => Promise<Blob | undefined> };

export const zipOsk = async (files: Packed[]): Promise<Blob> => {
	const input: Zippable = {};
	for (const file of files) {
		const blob = await file.read();
		if (!blob) continue;
		const level = STORED.has(fileType(file.path)) ? 0 : 6;
		input[file.path] = [new Uint8Array(await blob.arrayBuffer()), { level }];
	}
	const data = await new Promise<Uint8Array>((resolve, reject) =>
		zip(input, (err, out) => (err ? reject(err) : resolve(out))));
	return new Blob([data as Uint8Array<ArrayBuffer>], { type: 'application/zip' });
};

/** An installed skin's files, under the names the skin gave them. */
export const installedFiles = async (id: number): Promise<Packed[]> =>
	(await getManifest(id) ?? []).map((f: SkinFile) => ({
		path: f.path, read: () => getSkinFile(id, f.path),
	}));

/** The default skin's files. */
export const defaultFiles = () => Object.entries(DEFAULT_SKIN_FILES).map(([path, url]) => ({
	path, read: () => fetch(url).then(r => r.blob()),
}));

/** Hand the player a file to save. */
export const saveFile = (blob: Blob, name: string) => {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = name;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
};
