/** The local save: the game's sql.js database, one blob in IndexedDB. */
export const SAVE_DB = 'oss-idle';
/** The save's database before the rename to oss!idle. */
export const LEGACY_SAVE_DB = 'osu-idle';
export const SAVE_STORE = 'kv';
export const SAVE_KEY = 'data.sqlite';

/** Open a save database. Without `create`, a missing one fails and stays missing. */
export function openSave(name: string, create: boolean): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(name, 1);
		req.onupgradeneeded = () => {
			if (create) req.result.createObjectStore(SAVE_STORE);
			else req.transaction?.abort();
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

/** The save held in database `name`, if there is one. */
export async function readSave(name: string): Promise<Uint8Array | undefined> {
	try {
		const db = await openSave(name, false);
		try {
			const req = db.transaction(SAVE_STORE, 'readonly').objectStore(SAVE_STORE).get(SAVE_KEY);
			return await new Promise((resolve, reject) => {
				req.onsuccess = () => resolve(req.result as Uint8Array | undefined);
				req.onerror = () => reject(req.error);
			});
		} finally {
			db.close();
		}
	} catch {
		return undefined;
	}
}
