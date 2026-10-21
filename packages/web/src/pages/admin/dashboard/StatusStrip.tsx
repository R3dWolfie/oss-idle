type Props = {
	buckets: string[];
	start: number;
	bucketMs: number;
};

const LABEL: Record<string, string> = {
	ok: 'ok', fail: 'failed', none: 'no check',
};

/** A service's day, one cell per 5 minutes: green ok, red failed at least once. */
export default function StatusStrip({
	buckets, start, bucketMs,
}: Props) {
	return (
		<span
			className='status-strip'
			role='img'
			aria-label={`${buckets.filter(b => b === 'fail').length} failed periods`}
		>
			{buckets.map((state, i) => (
				<i
					key={i}
					className={`status-strip__cell ${state}`}
					title={`${new Date(start + i * bucketMs).toLocaleTimeString([], {
						hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
					})}: ${LABEL[state]}`}
				/>
			))}
		</span>
	);
}
