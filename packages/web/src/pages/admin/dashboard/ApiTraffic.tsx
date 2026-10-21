import type { AdminMetrics } from '../../../api/admin';
import Panel from './Panel';
import TimeChart from './TimeChart';
import {
	ms,
	num,
	pct,
} from './format';
import { VIA_NAME } from './hosts';

type Props = { metrics: AdminMetrics };

const MINUTES = 5;

/** What the API served, by where requests came in: volume, errors, handling time. */
export default function ApiTraffic({ metrics }: Props) {
	const vias = Object.keys(metrics.http).filter(v => metrics.http[v].day.n > 0);
	const slot = (i: number) => (Math.min(i, 2) + 1) as 1 | 2 | 3;
	const buckets = metrics.http.direct?.buckets ?? [];
	const across = (pick: (v: string, i: number) => number) =>
		buckets.map((_, i) => vias.reduce((n, v) => n + pick(v, i), 0));
	const all = across((v, i) => metrics.http[v].buckets[i].n);
	const fives = across((v, i) => metrics.http[v].status[i].s5);

	return (
		<Panel
			title='API'
			note='Every request the API answered, timed inside the server (network not included)'
		>
			<div className='admin-dashboard__grid'>
				<TimeChart
					title='Requests'
					note='per minute'
					start={metrics.start}
					bucketMs={metrics.bucketMs}
					format={num}
					series={vias.map((v, i) => ({
						label: VIA_NAME[v] ?? v, slot: slot(i),
						values: metrics.http[v].buckets.map(b => b.n / MINUTES),
					}))}
				/>
				<TimeChart
					title='Server errors (5xx)'
					note='share of requests'
					start={metrics.start}
					bucketMs={metrics.bucketMs}
					format={v => pct(v, 2)}
					floor={0.01}
					series={[{
						label: 'All', slot: 1,
						values: all.map((n, i) => (n ? fives[i] / n : undefined)),
					}]}
				/>
				<TimeChart
					title='Handling time, 95th percentile'
					start={metrics.start}
					bucketMs={metrics.bucketMs}
					format={ms}
					series={vias.map((v, i) => ({
						label: VIA_NAME[v] ?? v, slot: slot(i),
						values: metrics.http[v].buckets.map(b => b.p95 ?? undefined),
					}))}
				/>
				<TimeChart
					title='Errors the server logged'
					note='per 5 minutes, background work included'
					start={metrics.start}
					bucketMs={metrics.bucketMs}
					format={num}
					series={[{
						label: 'Logged errors', slot: 2, values: metrics.loggedErrors,
					}]}
				/>
			</div>
			<div className='admin-dashboard__grid'>
				<table className='admin-dashboard__table'>
					<thead>
						<tr><th>Came in</th><th>Requests</th><th>4xx</th><th>5xx</th><th>Median</th><th>p95</th><th>p99</th></tr>
					</thead>
					<tbody>
						{vias.map(v => {
							const d = metrics.http[v].day;
							return <tr key={v}>
								<td>{VIA_NAME[v] ?? v}</td>
								<td>{d.n.toLocaleString()}</td>
								<td>{pct(d.s4 / d.n)}</td>
								<td className={d.s5 ? 'bad' : ''}>{d.s5.toLocaleString()} ({pct(d.s5 / d.n, 2)})</td>
								<td>{ms(d.p50)}</td>
								<td>{ms(d.p95)}</td>
								<td>{ms(d.p99)}</td>
							</tr>;
						})}
					</tbody>
				</table>
				<table className='admin-dashboard__table'>
					<thead><tr><th>Failing route (24 h)</th><th>Count</th></tr></thead>
					<tbody>
						{metrics.errorsByRoute.length === 0 && <tr><td colSpan={2}>No server error.</td></tr>}
						{metrics.errorsByRoute.map(e => (
							<tr key={e.route}>
								<td><code>{e.route}</code></td>
								<td className='bad'>{e.n.toLocaleString()}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Panel>
	);
}
