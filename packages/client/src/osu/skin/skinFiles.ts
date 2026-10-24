import { normalizePath } from '@oss-idle/shared/osuSkin/files';
import type { SkinFile } from '@oss-idle/shared/skin';

/**
 * Installed skins' files, in IndexedDB: a manifest per skin (its files as the skin names
 * them, with the server's hash for a catalog skin) and each file's bytes, keyed by skin and
 * normalized path.
 */

const DB_NAME = 'skins';
const DB_VERSION = 1;

type Manifest = { id: number, files: SkinFile[] };

let dbPromise: Promise<IDBDatabase> | undefined;
const db = () => dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
	const req = indexedDB.open(DB_NAME, DB_VERSION);
	req.onupgradeneeded = () => {
		req.result.createObjectStore('manifests', { keyPath: 'id' });
		req.result.createObjectStore('files');
	};
	req.onsuccess = () => resolve(req.result);
	req.onerror = () => {
		dbPromise = undefined;
		reject(req.error);
	};
});

const done = (tx: IDBTransaction) => new Promise<void>((resolve, reject) => {
	tx.oncomplete = () => resolve();
	tx.onerror = () => reject(tx.error);
	tx.onabort = () => reject(tx.error);
});

const request = <T>(req: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
	req.onsuccess = () => resolve(req.result);
	req.onerror = () => reject(req.error);
});

const fileKey = (id: number, path: string) => `${id}/${normalizePath(path)}`;

const store = async (name: 'manifests' | 'files') =>
	(await db()).transaction(name).objectStore(name);

export const getManifest = async (id: number): Promise<SkinFile[] | undefined> =>
	(await request<Manifest | undefined>((await store('manifests')).get(id)))?.files;

export const getSkinFile = async (id: number, path: string): Promise<Blob | undefined> =>
	request<Blob | undefined>((await store('files')).get(fileKey(id, path)));

/** Store a skin's files, replacing what it held before. Files already stored under the same
 *  hash are kept as they are, so an update only writes what changed. */
export const putSkinFiles = async (
	id: number,
	files: SkinFile[],
	blobs: Map<string, Blob>,
): Promise<void> => {
	const before = await getManifest(id) ?? [];
	const tx = (await db()).transaction(['manifests', 'files'], 'readwrite');
	const bytes = tx.objectStore('files');
	const keep = new Set(files.map(f => normalizePath(f.path)));
	for (const old of before) {
		if (!keep.has(normalizePath(old.path))) bytes.delete(fileKey(id, old.path));
	}
	for (const file of files) {
		const blob = blobs.get(normalizePath(file.path));
		if (blob) bytes.put(blob, fileKey(id, file.path));
	}
	tx.objectStore('manifests').put({
		id, files,
	} satisfies Manifest);
	await done(tx);
};

export const deleteSkinFiles = async (id: number): Promise<void> => {
	const files = await getManifest(id) ?? [];
	const tx = (await db()).transaction(['manifests', 'files'], 'readwrite');
	for (const file of files) tx.objectStore('files').delete(fileKey(id, file.path));
	tx.objectStore('manifests').delete(id);
	await done(tx);
};

/** Move a skin's files to another id (an imported skin, once published). */
export const moveSkinFiles = async (from: number, to: number): Promise<void> => {
	const files = await getManifest(from);
	if (!files) return;
	const blobs = new Map<string, Blob>();
	for (const file of files) {
		const blob = await getSkinFile(from, file.path);
		if (blob) blobs.set(normalizePath(file.path), blob);
	}
	await putSkinFiles(to, files, blobs);
	await deleteSkinFiles(from);
};
