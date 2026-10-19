import { useLingui } from '@lingui/react/macro';
import { rateLabel } from '@oss-idle/shared/rate';

/** Under a lit rate mod: one step at a time along its side, as far as is unlocked. */
export default function RateStepper({ steps, unlocked, current, onPick }: {
	/** the side's rates, from x1 outwards */
	steps: number[],
	unlocked: number[],
	current: number,
	onPick: (rate: number) => void,
}) {
	const { t } = useLingui();
	const at = steps.indexOf(current);
	const inner = steps[at - 1];
	const outer = steps[at + 1];
	const outerOpen = outer !== undefined && unlocked.includes(outer);
	return (
		<div className="rate-stepper">
			<button
				type="button"
				className="rate-stepper__arrow"
				disabled={inner === undefined}
				onClick={() => onPick(inner!)}
			>‹</button>
			<span className="rate-stepper__value">{rateLabel(current)}</span>
			<button
				type="button"
				className="rate-stepper__arrow"
				disabled={!outerOpen}
				title={outer !== undefined && !outerOpen ? t`Each Speed upgrade unlocks one more step` : undefined}
				onClick={() => onPick(outer!)}
			>›</button>
		</div>
	);
}
