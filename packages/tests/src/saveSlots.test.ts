import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';

import {
	readSave,
	SAVE_SLOTS,
	writeSave,
} from '@oss-idle/shared/save';

/** A database file's first bytes, then `n` more. */
const sqlite = (n: number) =>
	new Uint8Array([...new TextEncoder().encode('SQLite format 3'), 0, n]);

/** The parts of an IDBRequest / IDBTransaction the save code touches. */
type Req = {
	result?: unknown,
	error?: DOMException,
	onsuccess?: () => void,
	onerror?: () => void,
	onupgradeneeded?: () => void,
	transaction?: { abort: () => void },
};
type Tx = { objectStore?: () => unknown, oncomplete?: () => void };

/** A tiny IndexedDB: one store per database, `broken` keys failing to read the way a
 *  blob emptied by a power cut does (UnknownError: Failed to read large IndexedDB value). */
const memoryIdb = () => {
	const dbs = new Map<string, Map<string, unknown>>();
	const broken = new Set<string>();
	const later = (fn: () => void) => setTimeout(fn);
	const fail = (r: Req, message: string, name: string) => {
		r.error = new DOMException(message, name);
		r.onerror?.();
	};
	const store = (data: Map<string, unknown>) => ({
		get: (key: string) => {
			const r: Req = {};
			later(() => {
				if (broken.has(key)) return fail(r, 'Failed to read large IndexedDB value', 'UnknownError');
				r.result = data.get(key);
				r.onsuccess?.();
			});
			return r;
		},
		put: (value: unknown, key: string) => {
			data.set(key, value);
			broken.delete(key);
		},
	});
	const open = (name: string) => {
		const req: Req = {};
		later(() => {
			const existed = dbs.has(name);
			if (!existed) dbs.set(name, new Map());
			const data = dbs.get(name)!;
			req.result = {
				close: () => {},
				createObjectStore: () => ({}),
				transaction: () => {
					const tx: Tx = { objectStore: () => store(data) };
					later(() => tx.oncomplete?.());
					return tx;
				},
			};
			if (!existed) {
				let aborted = false;
				req.transaction = { abort: () => { aborted = true; } };
				req.onupgradeneeded?.();
				if (aborted) {
					dbs.delete(name);
					return fail(req, '', 'AbortError');
				}
			}
			req.onsuccess?.();
		});
		return req;
	};
	return {
		idb: { open }, dbs, broken,
	};
};

let mem: ReturnType<typeof memoryIdb>;
beforeEach(() => {
	mem = memoryIdb();
	vi.stubGlobal('indexedDB', mem.idb);
});
afterEach(() => void vi.unstubAllGlobals());

describe('the save in two slots', () => {
	it('reads the newest whole slot', async () => {
		await writeSave('slots-a', sqlite(1));
		await writeSave('slots-a', sqlite(2));
		expect(await readSave('slots-a')).toEqual(sqlite(2));
	});

	it('writes the slot not written last, so one save is always left whole', async () => {
		await writeSave('slots-b', sqlite(1));
		await writeSave('slots-b', sqlite(2));
		const data = mem.dbs.get('slots-b')!;
		expect(data.get(SAVE_SLOTS[0])).toEqual(sqlite(1));
		expect(data.get(SAVE_SLOTS[1])).toEqual(sqlite(2));
	});

	it('falls back to the other slot when the newest was cut mid-write', async () => {
		await writeSave('slots-c', sqlite(1));
		await writeSave('slots-c', sqlite(2));
		mem.broken.add(SAVE_SLOTS[1]);
		expect(await readSave('slots-c')).toEqual(sqlite(1));
	});

	it('falls back too when the newest holds bytes that are not a database', async () => {
		await writeSave('slots-d', sqlite(1));
		await writeSave('slots-d', sqlite(2));
		mem.dbs.get('slots-d')!.set(SAVE_SLOTS[1], new Uint8Array(0));
		expect(await readSave('slots-d')).toEqual(sqlite(1));
	});

	it('still throws when no slot can be read, so no empty save replaces it', async () => {
		await writeSave('slots-e', sqlite(1));
		mem.broken.add(SAVE_SLOTS[0]);
		await expect(readSave('slots-e')).rejects.toThrow();
	});

	it('reads a save from before the slots (one key, no time) as it was', async () => {
		mem.dbs.set('slots-f', new Map<string, unknown>([[SAVE_SLOTS[0], sqlite(7)]]));
		expect(await readSave('slots-f')).toEqual(sqlite(7));
		// and the next save goes to the other slot, leaving that one whole
		await writeSave('slots-f', sqlite(8));
		expect(mem.dbs.get('slots-f')!.get(SAVE_SLOTS[0])).toEqual(sqlite(7));
		expect(await readSave('slots-f')).toEqual(sqlite(8));
	});

	it('reads a missing database as no save', async () => {
		await expect(readSave('slots-none')).resolves.toBeUndefined();
	});
});
