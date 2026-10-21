import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import {
	edgeList,
	pickApiBase,
} from '@oss-idle/shared/apiBase';

const EU = 'https://api.eu';
const NA = 'https://na.edge';
const KEY = 'oss-idle:api-base';

let store: Map<string, string>;
let reload: ReturnType<typeof vi.fn>;

/** Each origin answers after `ms` (Infinity: never answers). */
const network = (ms: Record<string, number>) => {
	vi.stubGlobal('fetch', vi.fn(async (url: string) => {
		const base = Object.keys(ms).find(b => url.startsWith(b))!;
		if (!Number.isFinite(ms[base])) throw new Error('unreachable');
		vi.advanceTimersByTime(ms[base]);
		return { ok: true };
	}));
};

/** Load the module fresh (it measures once per page load) and pick. */
const boot = async (edges = [NA]) => {
	vi.resetModules();
	const mod = await import('@oss-idle/shared/apiBase');
	const switched = vi.fn();
	mod.onApiBaseChange(switched);
	return {
		mod, switched, base: mod.pickApiBase(EU, edges),
	};
};

/** Pick, then let it measure. */
const load = async () => {
	const { base } = await boot();
	await vi.advanceTimersByTimeAsync(6000);
	return base;
};

/** A request that never answers until its signal gives up on it. */
const stalls = (_url: string, init?: RequestInit) => new Promise<Response>((_, reject) => {
	init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
});

beforeEach(() => {
	vi.useFakeTimers();
	store = new Map();
	reload = vi.fn();
	vi.stubGlobal('window', {});
	vi.stubGlobal('location', { reload });
	vi.stubGlobal('localStorage', {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => void store.set(k, v),
	});
	// AbortSignal.timeout runs on real timers; this one follows the fake clock
	vi.spyOn(AbortSignal, 'timeout').mockImplementation(ms => {
		const controller = new AbortController();
		setTimeout(() => controller.abort(new DOMException('timed out', 'TimeoutError')), ms);
		return controller.signal;
	});
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('API edge picking', () => {
	it('parses the edge list', () => {
		expect(edgeList(' https://a/, https://b ,')).toEqual(['https://a', 'https://b']);
		expect(edgeList(undefined)).toEqual([]);
	});

	it('keeps the build origin with no edge, or outside a browser', () => {
		expect(pickApiBase(EU, [])).toBe(EU);
		vi.stubGlobal('window', undefined);
		expect(pickApiBase(EU, [NA])).toBe(EU);
	});

	it('starts on the build origin and remembers a faster edge for the next load', async () => {
		network({
			[EU]: 180, [NA]: 30, 
		});
		expect(await load()).toBe(EU);
		expect(store.get(KEY)).toBe(NA);
		expect(await load()).toBe(NA);
		expect(reload).not.toHaveBeenCalled();
	});

	it('stays on the build origin when an edge is barely faster', async () => {
		network({
			[EU]: 40, [NA]: 30, 
		});
		await load();
		expect(store.get(KEY)).toBe(EU);
	});

	it('moves onto the build origin, live, when the edge in use stops answering', async () => {
		store.set(KEY, NA);
		network({
			[EU]: 40, [NA]: Infinity, 
		});
		const { switched } = await boot();
		await vi.advanceTimersByTimeAsync(6000);
		expect(switched).toHaveBeenCalledWith(EU);
		expect(store.get(KEY)).toBe(EU);
		expect(reload).not.toHaveBeenCalled();
	});

	it('ignores a stored origin that is no longer offered', async () => {
		store.set(KEY, 'https://gone');
		network({
			[EU]: 40, [NA]: 200, 
		});
		expect(await load()).toBe(EU);
	});
});

describe('API failover', () => {
	it('moves a stalled read onto another origin and stays there', async () => {
		network({
			[EU]: 40, [NA]: 30,
		});
		const { mod, switched } = await boot();
		const doFetch = vi.fn(async (url: string, init?: RequestInit) =>
			(url.startsWith(EU) ? stalls(url, init) : new Response('ok')));
		const res = mod.failoverFetch(doFetch as typeof fetch)(`${EU}/v1/me/character`);
		await vi.advanceTimersByTimeAsync(11_000);
		expect(await (await res).text()).toBe('ok');
		expect(doFetch.mock.lastCall?.[0]).toBe(`${NA}/v1/me/character`);
		expect(switched).toHaveBeenCalledWith(NA);
		expect(store.get(KEY)).toBe(NA);
		// later requests built on the old origin go to the new one straight away
		expect(mod.onApiBase(`${EU}/v1/x`)).toBe(`${NA}/v1/x`);
	});

	it('moves a read whose answer starts but whose body stalls', async () => {
		network({
			[EU]: 40, [NA]: 30,
		});
		const { mod, switched } = await boot();
		const doFetch = vi.fn(async (url: string, init?: RequestInit) => (url.startsWith(EU)
			? new Response(new ReadableStream({
				start: controller => init?.signal?.addEventListener('abort', () =>
					controller.error(init.signal!.reason)),
			}))
			: new Response('{"id":1}', { status: 200 })));
		const res = mod.failoverFetch(doFetch as typeof fetch)(`${EU}/v1/me/character`);
		await vi.advanceTimersByTimeAsync(11_000);
		expect(await (await res).json()).toEqual({ id: 1 });
		expect(switched).toHaveBeenCalledWith(NA);
	});

	it('switches once for many stalled reads', async () => {
		network({
			[EU]: 40, [NA]: 30,
		});
		const { mod, switched } = await boot();
		const doFetch = vi.fn(async (url: string, init?: RequestInit) =>
			(url.startsWith(EU) ? stalls(url, init) : new Response('ok')));
		const fetcher = mod.failoverFetch(doFetch as typeof fetch);
		const all = Promise.all([1, 2, 3].map(i => fetcher(`${EU}/v1/${i}`)));
		await vi.advanceTimersByTimeAsync(11_000);
		await all;
		expect(switched).toHaveBeenCalledOnce();
	});

	it('sends a write once, where it was going', async () => {
		network({
			[EU]: 40, [NA]: 30,
		});
		const { mod, switched } = await boot();
		const doFetch = vi.fn(async () => {
			throw new TypeError('network');
		});
		const init = {
			method: 'POST', body: '{}', 
		};
		await expect(mod.failoverFetch(doFetch)(`${EU}/v1/score`, init)).rejects.toThrow('network');
		expect(doFetch).toHaveBeenCalledOnce();
		expect(doFetch).toHaveBeenCalledWith(`${EU}/v1/score`, init);
		expect(switched).not.toHaveBeenCalled();
	});

	it('goes out as it would have when no other origin answers', async () => {
		network({
			[EU]: 40, [NA]: Infinity,
		});
		const { mod, switched } = await boot();
		const doFetch = vi.fn(async (url: string, init?: RequestInit) =>
			(init?.signal ? stalls(url, init) : new Response('late')));
		const res = mod.failoverFetch(doFetch as typeof fetch)(`${EU}/v1/me`);
		await vi.advanceTimersByTimeAsync(11_000);
		expect(await (await res).text()).toBe('late');
		expect(doFetch).toHaveBeenLastCalledWith(`${EU}/v1/me`, undefined);
		expect(switched).not.toHaveBeenCalled();
	});

	it('gives up with the caller when its own signal ends the read', async () => {
		network({
			[EU]: 40, [NA]: 30,
		});
		const { mod, switched } = await boot();
		const signal = AbortSignal.timeout(2000);
		const res = mod.failoverFetch(stalls as typeof fetch)(`${EU}/v1/me`, { signal });
		const settled = expect(res).rejects.toThrow('timed out');
		await vi.advanceTimersByTimeAsync(3000);
		await settled;
		expect(switched).not.toHaveBeenCalled();
	});

	it('does not measure its way back onto an origin that failed a read', async () => {
		network({
			[EU]: 30, [NA]: 200,
		});
		const { mod } = await boot();
		const doFetch = vi.fn(async (url: string, init?: RequestInit) =>
			(url.startsWith(EU) ? stalls(url, init) : new Response('ok')));
		const res = mod.failoverFetch(doFetch as typeof fetch)(`${EU}/v1/me`);
		await vi.advanceTimersByTimeAsync(11_000);
		await res;
		// the 5 s measure ran meanwhile; EU answers its probe fastest but stalled for real
		await vi.advanceTimersByTimeAsync(6000);
		expect(store.get(KEY)).toBe(NA);
		expect(mod.onApiBase(`${EU}/v1/x`)).toBe(`${NA}/v1/x`);
	});

	it('leaves requests alone with a single origin', async () => {
		const { mod } = await boot([]);
		const doFetch = vi.fn(async () => new Response('ok'));
		await mod.failoverFetch(doFetch)(`${EU}/v1/me`);
		expect(doFetch).toHaveBeenCalledWith(`${EU}/v1/me`, undefined);
	});
});
