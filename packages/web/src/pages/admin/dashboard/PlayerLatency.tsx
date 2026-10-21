import type { AdminMetrics } from '../../../api/admin';
import Panel from './Panel';
import TimeChart from './TimeChart';
import { ms } from './format';
import { serverName } from './hosts';

type Props = { metrics: AdminMetrics };

/** Round trips the game itself measured to each server, by player continent. */
export default function PlayerLatency({ metrics }: Props) {
	const hosts = Object.keys(metrics.rtt);
	const slot = (i: number) => (Math.min(i, 2) + 1) as 1 | 2 | 3;
	const reports = (c: string) =>
		hosts.reduce((n, h) => n + (metrics.rtt[h].continents[c]?.n ?? 0), 0);
	const continents = [...new Set(hosts.flatMap(h => Object.keys(metrics.rtt[h].continents)))]
		.sort((a, b) => reports(b) - reports(a));

	return (
		<Panel
			title='Player latency'
			note='Round trips the game measures to each server a few seconds after loading (best of 3)'
		>
			<div className='admin-dashboard__grid'>
				{(['p50', 'p95'] as const).map(q => (
					<TimeChart
						key={q}
						title={q === 'p50' ? 'Median round trip' : '95th percentile round trip'}
						start={metrics.start}
						bucketMs={metrics.bucketMs}
						format={ms}
						series={hosts.map((host, i) => ({
							label: serverName(host, i),
							slot: slot(i),
							values: metrics.rtt[host].overall.buckets.map(b => b[q] ?? undefined),
						}))}
					/>
				))}
			</div>
			<table className='admin-dashboard__table'>
				<thead>
					<tr>
						<th>Continent</th>
						{hosts.map((host, i) => <th key={host}>{serverName(host, i)}<br />median · p95 · reports</th>)}
					</tr>
				</thead>
				<tbody>
					{continents.length === 0 && <tr><td colSpan={hosts.length + 1}>No reports yet.</td></tr>}
					{continents.map(c => (
						<tr key={c}>
							<td>{c}</td>
							{hosts.map(host => {
								const day = metrics.rtt[host].continents[c];
								return <td key={host}>{day ? `${ms(day.p50)} · ${ms(day.p95)} · ${day.n}` : '-'}</td>;
							})}
						</tr>
					))}
				</tbody>
			</table>
		</Panel>
	);
}
