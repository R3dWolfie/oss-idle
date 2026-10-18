import './RateBadge.css';
import { rateLabel } from '@osu-idle/shared/rate';

/** A score's rate mod: Double (faster) or Half (slower), with its rate. Nothing at x1. */
export default function RateBadge({ rate }: { rate: number | string }) {
	const value = Number(rate);
	if (!value || value === 1) return null;
	const side = value > 1 ? 'double' : 'half';
	return <span className='rate-badge' data-side={side}>{rateLabel(value)}</span>;
}
