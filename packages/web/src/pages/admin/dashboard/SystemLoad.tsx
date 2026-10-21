import type { AdminMetrics } from '../../../api/admin';
import Panel from './Panel';
import TimeChart from './TimeChart';
import {
	ms,
	num,
} from './format';

type Props = { metrics: AdminMetrics };

const gauge = (values: number[]) => values.map(v => (v ? v : undefined));

/** The API server itself: load, memory, the event loop, Redis and MySQL. Highest each 5 minutes. */
export default function SystemLoad({ metrics }: Props) {
	const s = metrics.system;
	const chart = {
		start: metrics.start, bucketMs: metrics.bucketMs, height: 130,
	};
	return (
		<Panel title='API server' note='Highest value in each 5 minutes'>
			<div className='admin-dashboard__grid admin-dashboard__grid--small'>
				<TimeChart
					{...chart}
					title='Load'
					note='1-minute average, 8 cores'
					format={v => v.toFixed(1)}
					floor={1}
					series={[{
						label: 'Load', slot: 1, values: gauge(s.load1),
					}]}
				/>
				<TimeChart
					{...chart}
					title='Memory used'
					format={v => `${Math.round(v)}%`}
					floor={100}
					series={[{
						label: 'Memory', slot: 1, values: gauge(s.mem),
					}]}
				/>
				<TimeChart
					{...chart}
					title='Event loop delay'
					note='99th percentile, worst worker'
					format={ms}
					series={[{
						label: 'Delay', slot: 2, values: gauge(s.lag_p99),
					}]}
				/>
				<TimeChart
					{...chart}
					title='Redis'
					note='memory'
					format={v => `${Math.round(v)} MB`}
					series={[{
						label: 'Memory', slot: 1, values: gauge(s.redis_mb),
					}]}
				/>
				<TimeChart
					{...chart}
					title='Redis'
					note='commands per second'
					format={num}
					series={[{
						label: 'Commands', slot: 3, values: gauge(s.redis_ops),
					}]}
				/>
				<TimeChart
					{...chart}
					title='MySQL connections'
					format={num}
					series={[
						{
							label: 'Open', slot: 1, values: gauge(s.db_threads_connected),
						},
						{
							label: 'Running', slot: 2, values: gauge(s.db_threads_running),
						},
					]}
				/>
			</div>
		</Panel>
	);
}
