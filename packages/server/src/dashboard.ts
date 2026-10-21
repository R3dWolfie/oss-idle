import { redis } from './redis';
import { redisKeyPrefix } from './env';
import {
	BUCKET_MS,
	firstBucket,
	LATENCY_BINS,
	readSeries,
	VIAS,
} from './metrics';

/** The admin dashboard's report: the last day of metrics.ts, merged into what a page draws. */

type Row = Record<string, number>;

// the top bin's upper edge, for interpolating inside it
const OPEN_EDGE = LATENCY_BINS.at(-1)! * 2;

/** Approximate percentile `q` (0..1) of a latency histogram stored under `prefix`. */
const percentile = (row: Row, q: number, prefix = ''): number | undefined => {
	const n = row[`${prefix}n`] ?? 0;
	if (!n) return undefined;
	let seen = 0;
	for (let i = 0; i <= LATENCY_BINS.length; i++) {
		const inBin = row[`${prefix}b${i}`] ?? 0;
		if (seen + inBin >= q * n && inBin) {
			const low = i ? LATENCY_BINS[i - 1] : 0;
			const high = LATENCY_BINS[i] ?? OPEN_EDGE;
			return Math.round(low + (high - low) * ((q * n - seen) / inBin));
		}
		seen += inBin;
	}
	return OPEN_EDGE;
};

/** Every bucket summed into one row. */
const total = (rows: Row[]): Row => {
	const sum: Row = {};
	for (const row of rows) for (const [k, v] of Object.entries(row)) sum[k] = (sum[k] ?? 0) + v;
	return sum;
};

const field = (rows: Row[], name: string) => rows.map(row => row[name] ?? 0);

/** Latency summary of a histogram (per bucket and over the day), under `prefix`. */
const latency = (rows: Row[], prefix = '') => ({
	buckets: rows.map(row => ({
		n: row[`${prefix}n`] ?? 0,
		p50: percentile(row, 0.5, prefix),
		p95: percentile(row, 0.95, prefix),
	})),
	day: (() => {
		const all = total(rows);
		return {
			n: all[`${prefix}n`] ?? 0,
			p50: percentile(all, 0.5, prefix),
			p95: percentile(all, 0.95, prefix),
			p99: percentile(all, 0.99, prefix),
		};
	})(),
});

const viaReport = async (via: string) => {
	const rows = await readSeries(`http:${via}`);
	const lat = latency(rows);
	const all = total(rows);
	return {
		buckets: lat.buckets,
		status: rows.map(row => ({
			s2: row.s2 ?? 0, s3: row.s3 ?? 0, s4: row.s4 ?? 0, s5: row.s5 ?? 0,
		})),
		day: {
			...lat.day, s4: all.s4 ?? 0, s5: all.s5 ?? 0,
		},
	};
};

const http = async () => Object.fromEntries(await Promise.all(VIAS.map(async via =>
	[via, await viaReport(via)] as const)));

const errorsByRoute = async () => {
	const all = total(await readSeries('errors'));
	return Object.entries(all)
		.map(([route, n]) => ({
			route, n,
		}))
		.filter(e => e.n > 0)
		.sort((a, b) => b.n - a.n)
		.slice(0, 15);
};

/** Round trips the game measured to each API origin, overall and by continent. */
const rtt = async (hosts: string[]) => {
	const out: Record<string, {
		overall: ReturnType<typeof latency>;
		continents: Record<string, ReturnType<typeof latency>['day']>;
	}> = {};
	for (const host of hosts) {
		const rows = await readSeries(`rtt:${host}`);
		const continents = [...new Set(rows.flatMap(row => Object.keys(row))
			.map(k => k.split(':')[0]))];
		// one histogram across continents, per bucket
		const merged = rows.map(row => {
			const m: Row = {};
			for (const [k, v] of Object.entries(row)) {
				const name = k.split(':')[1];
				m[name] = (m[name] ?? 0) + v;
			}
			return m;
		});
		out[host] = {
			overall: latency(merged),
			continents: Object.fromEntries(continents.map(c => [c, latency(rows, `${c}:`).day])),
		};
	}
	return out;
};

const PROBE_LAST = `${redisKeyPrefix}metrics:probe-last`;

const probes = async () => {
	const last = await redis.hgetall(PROBE_LAST);
	const out = [];
	for (const [name, json] of Object.entries(last)) {
		const rows = await readSeries(`probe:${name}`);
		const ok = rows.reduce((n, row) => n + (row.ok ?? 0), 0);
		const fail = rows.reduce((n, row) => n + (row.fail ?? 0), 0);
		out.push({
			name,
			last: JSON.parse(json) as { ok: boolean; ms: number; at: number; error?: string },
			uptime: ok + fail ? ok / (ok + fail) : undefined,
			latency: latency(rows),
			buckets: rows.map(row => (row.fail ? 'fail' : row.ok ? 'ok' : 'none')),
		});
	}
	return out.sort((a, b) => a.name.localeCompare(b.name));
};

const ACTIVITY = [
	'online', 'playing', 'plays_started', 'plays_finished', 'logins', 'signups', 'chat', 'sockets',
] as const;
const SYSTEM = [
	'load1', 'mem', 'lag_p99', 'redis_mb', 'redis_ops', 'redis_clients',
	'db_threads_connected', 'db_threads_running',
] as const;

const gauges = async <K extends string>(series: string, names: readonly K[]) => {
	const rows = await readSeries(series);
	return Object.fromEntries(names.map(name => [name, field(rows, name)])) as Record<K, number[]>;
};

/** Everything the dashboard shows. */
export const dashboard = async (rttHosts: string[]) => ({
	bucketMs: BUCKET_MS,
	start: firstBucket() * BUCKET_MS,
	http: await http(),
	errorsByRoute: await errorsByRoute(),
	loggedErrors: field(await readSeries('logged'), 'errors'),
	rtt: await rtt(rttHosts),
	probes: await probes(),
	activity: await gauges('activity', ACTIVITY),
	system: await gauges('system', SYSTEM),
});
