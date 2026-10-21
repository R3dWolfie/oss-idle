/**
 * Which API origin a page talks to: the build's own, or an edge closer to the
 * player (`VITE_API_EDGES`). A page starts on the one it stored last time; a few
 * seconds in, it measures them all and stores the fastest for the next load. If
 * the one in use stops answering, or a read through it stalls ({@link failoverFetch}),
 * the page moves onto another that answers, live: no reload.
 * The game and the web platform share an origin, so they share the choice.
 */

const KEY = 'oss-idle:api-base';
const MEASURE_DELAY_MS = 5000;
const PROBES = 3;
// an edge has to win by this much to be worth leaving the build's own origin
const EDGE_MARGIN_MS = 20;
// a read that hasn't answered by then counts as stalled: some networks let the
// tiny probe through and freeze bigger answers, so the probe alone can't tell
const STALL_MS = 10_000;

const read = (): string | undefined => {
	try {
		return localStorage.getItem(KEY) ?? undefined;
	} catch {
		return undefined;
	}
};

const write = (base: string) => {
	try {
		localStorage.setItem(KEY, base);
	} catch {
		// private mode: the build's own origin, every load
	}
};

/** Best of a few round trips to a public route, in ms; Infinity when it doesn't answer. */
const roundTrip = async (base: string, probes = PROBES): Promise<number> => {
	let best = Infinity;
	for (let i = 0; i < probes; i++) {
		const start = performance.now();
		try {
			const res = await fetch(`${base}/v1/stats/version`, {
				cache: 'no-store', signal: AbortSignal.timeout(5000),
			});
			if (res.ok) best = Math.min(best, performance.now() - start);
		} catch {
			// unreachable: stays Infinity unless another probe answers
		}
	}
	return best;
};

let bases: string[] = [];
let current = '';
// origins that failed a real request this page load: measuring won't pick them again
const failed = new Set<string>();
const listeners = new Set<(base: string) => void>();

const switchTo = (base: string) => {
	current = base;
	write(base);
	for (const listener of listeners) listener(base);
};

/** Called with the new origin whenever the page moves onto another one. */
export const onApiBaseChange = (listener: (base: string) => void) => void listeners.add(listener);

/** `url` moved onto the origin in use, when it was built on another of ours. */
export const onApiBase = (url: string): string => {
	const from = bases.find(base => base !== current && url.startsWith(`${base}/`));
	return from ? current + url.slice(from.length) : url;
};

let switching: Promise<boolean> | undefined;

/** Leave `from` for the fastest other origin that answers; false when none does.
 *  Concurrent callers share one switch. */
export const failover = (from: string): Promise<boolean> => {
	if (current !== from) return Promise.resolve(true);
	failed.add(from);
	switching ??= (async () => {
		const others = bases.filter(base => base !== from);
		const times = await Promise.all(others.map(base => roundTrip(base, 1)));
		const best = times.indexOf(Math.min(...times));
		if (best < 0 || !Number.isFinite(times[best])) return false;
		switchTo(others[best]);
		return true;
	})().finally(() => {
		switching = undefined;
	});
	return switching;
};

let measuring = false;

/** What one load measured: each origin's best round trip (unreachable ones left out). */
export type Measured = { base: string; ms: number }[];

const measure = async (primary: string, onMeasured?: (measured: Measured) => void) => {
	if (measuring) return;
	measuring = true;
	const times = new Map<string, number>();
	for (const base of bases) times.set(base, await roundTrip(base));
	onMeasured?.(bases.filter(base => Number.isFinite(times.get(base)!)).map(base => ({
		base, ms: Math.round(times.get(base)!),
	})));
	const candidates = bases.filter(base => !failed.has(base));
	if (!candidates.length) return;
	const fastest = candidates.reduce((a, b) => (times.get(b)! < times.get(a)! ? b : a));
	if (!Number.isFinite(times.get(fastest)!)) return;
	const choice = fastest !== primary && candidates.includes(primary)
		&& times.get(primary)! - times.get(fastest)! < EDGE_MARGIN_MS
		? primary
		: fastest;
	// ponytail: a network that stalls only big answers passes the probe, so the next
	// load may start on that origin again and lose STALL_MS before moving; remember
	// failed origins across loads if that bites
	if (!Number.isFinite(times.get(current)!) && choice !== current) switchTo(choice);
	else write(choice);
};

/** The API origin for this page load. `onMeasured` gets the round trips once measured. */
export const pickApiBase = (
	primary: string,
	edges: string[],
	onMeasured?: (measured: Measured) => void,
): string => {
	bases = [primary, ...edges.filter(edge => edge && edge !== primary)];
	current = primary;
	if (!primary || bases.length === 1 || typeof window === 'undefined') {
		bases = [primary];
		return primary;
	}
	const stored = read();
	if (stored && bases.includes(stored)) current = stored;
	setTimeout(() => void measure(primary, onMeasured), MEASURE_DELAY_MS);
	return current;
};

const isRead = (init?: RequestInit) =>
	['GET', 'HEAD'].includes(init?.method?.toUpperCase() ?? 'GET');

/**
 * `doFetch` on the origin in use. A read that fails or stalls past STALL_MS moves
 * the page onto another origin and tries again there; once no other answers, it
 * goes out as `doFetch` would have sent it. Writes go out once, untouched: one
 * that reached the server but lost its answer must not land twice.
 */
export const failoverFetch = (doFetch: typeof fetch): typeof fetch => async (input, init) => {
	const url = onApiBase(String(input));
	if (!isRead(init)) return doFetch(url, init);
	for (let tries = 1; tries < bases.length; tries++) {
		const from = current;
		const stall = AbortSignal.timeout(STALL_MS);
		// without AbortSignal.any (older browsers) the caller's own signal decides
		const signal = init?.signal ? AbortSignal.any?.([init.signal, stall]) : stall;
		if (!signal) break;
		try {
			const res = await doFetch(onApiBase(url), {
				...init, signal,
			});
			// read it whole here: a stall usually lets the headers through and freezes the body
			const body = [101, 204, 205, 304].includes(res.status) ? null : await res.blob();
			return new Response(body, res);
		} catch (e) {
			if (init?.signal?.aborted) throw e;
			if (!await failover(from)) break;
		}
	}
	return doFetch(onApiBase(url), init);
};

/** The comma-separated `VITE_API_EDGES` as a list. */
export const edgeList = (value: string | undefined): string[] =>
	(value ?? '').split(',').map(edge => edge.trim().replace(/\/$/, '')).filter(Boolean);
