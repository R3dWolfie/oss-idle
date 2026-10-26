/** The local save: the game's sql.js database, one blob in IndexedDB. */
export const SAVE_DB = 'oss-idle';
/** The save's database before the rename to oss!idle. */
export const LEGACY_SAVE_DB = 'osu-idle';
export const SAVE_STORE = 'kv';
export const SAVE_KEY = 'data.sqlite';

/**
 * The save is written to two slots in turn, each with the time it was written, and read
 * from the newest one that holds a whole database. A power cut while a save is written
 * can leave that slot's blob empty (Chromium's "Failed to read large IndexedDB value"):
 * the other slot still holds the save from just before. The first slot is the one older
 * versions wrote, so their saves read as an older slot.
 */
export const SAVE_SLOTS = [SAVE_KEY, `${SAVE_KEY}.b`] as const;
type Slot = typeof SAVE_SLOTS[number];
const writtenAt = (slot: Slot) => `${slot}.at`;

/** The slot each database was last read from or written to: the next save goes to the other. */
const lastSlot = new Map<string, Slot>();
/** The last time written, so two saves in the same millisecond still order */
let lastAt = 0;

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

const get = <T>(store: IDBObjectStore, key: string) => new Promise<T | undefined>((
	resolve, reject,
) => {
	const req = store.get(key);
	req.onsuccess = () => resolve(req.result as T | undefined);
	req.onerror = () => reject(req.error);
});

/** Whether `bytes` start like a SQLite database file ("SQLite format 3\0"). */
const SQLITE_HEADER = [83, 81, 76, 105, 116, 101, 32, 102, 111, 114, 109, 97, 116, 32, 51, 0];
export const isSqlite = (bytes: Uint8Array | undefined): bytes is Uint8Array =>
	!!bytes && bytes.length >= SQLITE_HEADER.length && SQLITE_HEADER.every((b, i) => bytes[i] === b);

/** The save held in database `name`, if there is one: its newest whole slot. Throws when
 *  IndexedDB can't be read (its files still held by the previous run, after an update) or
 *  no slot can: taken for no save, an empty one would be written over the player's. */
export async function readSave(name: string): Promise<Uint8Array | undefined> {
	let db: IDBDatabase;
	try {
		db = await openSave(name, false);
	} catch (e) {
		if (e instanceof DOMException && e.name === 'AbortError') return undefined;
		throw e;
	}
	try {
		const store = () => db.transaction(SAVE_STORE, 'readonly').objectStore(SAVE_STORE);
		const at = await Promise.all(SAVE_SLOTS.map(slot =>
			get<number>(store(), writtenAt(slot)).catch(() => undefined)));
		const order = SAVE_SLOTS.map((slot, i) => ({
			slot, at: at[i] ?? 0, 
		})).sort((a, b) => b.at - a.at);
		let failed: unknown;
		for (const { slot } of order) {
			let bytes: Uint8Array | undefined;
			try {
				bytes = await get<Uint8Array>(store(), slot);
			} catch (e) {
				failed ??= e;
				continue;
			}
			if (isSqlite(bytes)) {
				lastSlot.set(name, slot);
				return bytes;
			}
			// (written, but not a whole database: a cut mid-write)
			if (bytes !== undefined) failed ??= new Error(`the save in ${slot} is not a database`);
		}
		if (failed) throw failed;
		return undefined;
	} finally {
		db.close();
	}
}

/** Save `bytes` to database `name`, into the slot not written last; resolves on commit. */
export async function writeSave(name: string, bytes: Uint8Array): Promise<void> {
	const slot = lastSlot.get(name) === SAVE_SLOTS[0] ? SAVE_SLOTS[1] : SAVE_SLOTS[0];
	const db = await openSave(name, true);
	try {
		const tx = db.transaction(SAVE_STORE, 'readwrite');
		const store = tx.objectStore(SAVE_STORE);
		store.put(bytes, slot);
		store.put(lastAt = Math.max(Date.now(), lastAt + 1), writtenAt(slot));
		// resolves on commit, not on the put's success: a reload in between drops it
		await new Promise<void>((resolve, reject) => {
			tx.oncomplete = () => resolve();
			tx.onerror = tx.onabort = () => reject(tx.error);
		});
		lastSlot.set(name, slot);
	} finally {
		db.close();
	}
}
