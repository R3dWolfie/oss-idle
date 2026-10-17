import { ph } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';

const amount = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

/** Progress toward a medal: where the character is now, and its best when it was higher. */
export default function MedalProgressBar({ value, current, goal }: {
	value: number,
	current: number,
	goal: number,
}) {
	const best = Math.min(value, goal);
	const now = Math.min(current, goal);
	const [n, b, g] = [now, best, goal].map(x => amount.format(x));
	return <>
		<div className='profile-medal__date'>
			{now < best
				? <Trans>{ph({ now: n })} / {ph({ goal: g })} (best {ph({ best: b })})</Trans>
				: `${b} / ${g}`}
		</div>
		<div className='profile-medal__progress'>
			{now < best && <div className='is-best' style={{ width: `${best / goal * 100}%` }} />}
			<div style={{ width: `${now / goal * 100}%` }} />
		</div>
	</>;
}
