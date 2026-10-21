import type { AdminMetrics } from '../../../api/admin';
import Panel from './Panel';
import StatusStrip from './StatusStrip';
import {
	clock,
	ms,
	pct,
} from './format';

type Props = { metrics: AdminMetrics };

/** Every service prod depends on, checked from the API server once a minute. */
export default function ServiceHealth({ metrics }: Props) {
	return (
		<Panel title='Services' note='Checked from the API server every minute; each cell is 5 minutes'>
			<table className='admin-dashboard__table admin-dashboard__health'>
				<thead>
					<tr><th>Service</th><th>Now</th><th>Uptime</th><th>Median</th><th>p95</th><th>Last 24 hours</th></tr>
				</thead>
				<tbody>
					{metrics.probes.length === 0 && <tr><td colSpan={6}>No check yet.</td></tr>}
					{metrics.probes.map(p => (
						<tr key={p.name}>
							<td>{p.name}</td>
							<td>
								<span className={`admin-dashboard__state ${p.last.ok ? 'up' : 'down'}`}>
									{p.last.ok ? '✓ up' : '✕ down'}
								</span>
								<span className='admin-dashboard__muted'> {ms(p.last.ms)} · {clock(p.last.at)}</span>
								{p.last.error && <div className='admin-dashboard__muted'>{p.last.error}</div>}
							</td>
							<td>{pct(p.uptime ?? undefined, 2)}</td>
							<td>{ms(p.latency.day.p50)}</td>
							<td>{ms(p.latency.day.p95)}</td>
							<td><StatusStrip buckets={p.buckets} start={metrics.start} bucketMs={metrics.bucketMs} /></td>
						</tr>
					))}
				</tbody>
			</table>
		</Panel>
	);
}
