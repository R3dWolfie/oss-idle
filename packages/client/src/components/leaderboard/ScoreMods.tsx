import { rateLabel } from '@oss-idle/shared/rate';

/** A leaderboard row's mods: its rate when it isn't x1. */
export default function ScoreMods({ rate }: { rate: number }) {
	return <span className="score_entry__mods">{rate !== 1 ? rateLabel(rate) : '‎'}</span>;
}
