import { createMiddleware } from 'hono/factory';
import { redis } from './redis';
import { redisKeyPrefix } from './env';

/** The dashboard's time buckets: 5 minutes, a day of them. */
export const BUCKET_MS = 5 * 60_000;
export const BUCKETS = 288;
export const bucketOf = (at = Date.now()) => Math.floor(at / BUCKET_MS);

/**
 * The admin dashboard's numbers: counters and latency histograms in 5-minute
 * buckets, kept a little over a day in Redis. Every worker counts in memory and
 * flushes every few seconds, so a request never waits on them.
 */

const KEEP_S = 26 * 3600;
const FLUSH_MS = 5000;

/** Upper edges of the latency bins, ms; bin `b<length>` holds everything above. */
export const LATENCY_BINS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

/** Where a request came in: straight to this server, or through an edge that says so. */
export const VIAS = ['direct', 'na', 'fr', 'home'] as const;

const key = (series: string, bucket: number) => `${redisKeyPrefix}metrics:${series}:${bucket}`;

const binOf = (ms: number) => {
	const i = LATENCY_BINS.findIndex(edge => ms <= edge);
	return i === -1 ? LATENCY_BINS.length : i;
};

const pending = new Map<string, Map<string, number>>();

/** Add `by` to a counter of the current bucket. */
export const count = (series: string, field = 'n', by = 1) => {
	const k = key(series, bucketOf());
	let fields = pending.get(k);
	if (!fields) pending.set(k, fields = new Map());
	fields.set(field, (fields.get(field) ?? 0) + by);
};

/** One timed event: its count and latency bin, under `prefix` (e.g. a continent). */
export const timing = (series: string, ms: number, prefix = '') => {
	count(series, `${prefix}n`);
	count(series, `${prefix}b${binOf(ms)}`);
};

const MAX = `local c = tonumber(redis.call('HGET', KEYS[1], ARGV[1]) or '-1e308')
if tonumber(ARGV[2]) > c then redis.call('HSET', KEYS[1], ARGV[1], ARGV[2]) end
redis.call('EXPIRE', KEYS[1], ARGV[3])`;

/** Keep the highest value seen this bucket (a gauge sampled by several workers). */
export const gaugeMax = (series: string, field: string, value: number) =>
	redis.eval(MAX, 1, key(series, bucketOf()), field, String(value), String(KEEP_S))
		.catch(() => undefined);

// counting must never recurse into console.error, which it also counts
const logError = console.error.bind(console);

const flush = async () => {
	if (!pending.size || redis.status !== 'ready') return;
	const batch = [...pending];
	pending.clear();
	const tx = redis.pipeline();
	for (const [k, fields] of batch) {
		for (const [field, by] of fields) tx.hincrbyfloat(k, field, by);
		tx.expire(k, KEEP_S);
	}
	await tx.exec().catch(err => logError('[metrics] flush failed:', err.message));
};
setInterval(() => void flush(), FLUSH_MS).unref();

/** Count every error the server logs, background work included. */
export const countLoggedErrors = () => {
	console.error = (...args: unknown[]) => {
		count('logged', 'errors');
		logError(...args);
	};
};

/** The first of the buckets the dashboard shows: the last day of complete ones (the
 *  current one is still filling, and would read as a drop). */
export const firstBucket = () => bucketOf() - BUCKETS;

/** The last `BUCKETS` complete buckets of a series, oldest first. */
export const readSeries = async (series: string): Promise<Record<string, number>[]> => {
	const first = firstBucket();
	const tx = redis.pipeline();
	for (let b = first; b < first + BUCKETS; b++) tx.hgetall(key(series, b));
	const rows = await tx.exec() ?? [];
	return rows.map(([, row]) => Object.fromEntries(Object.entries(row as Record<string, string>)
		.map(([field, value]) => [field, Number(value)])));
};

/** Request volume, status classes and handling time, by entry point; 5xx by route. */
export const httpMetrics = createMiddleware(async (c, next) => {
	const start = performance.now();
	await next();
	const header = c.req.header('x-oss-via');
	const via = VIAS.find(v => v === header) ?? 'direct';
	const status = c.res.status;
	timing(`http:${via}`, performance.now() - start);
	count(`http:${via}`, `s${Math.floor(status / 100)}`);
	if (status >= 500) {
		count('errors', `${c.req.method} ${c.req.path.replace(/\/\d+(?=\/|$)/g, '/:id')} ${status}`);
	}
});
