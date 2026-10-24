import rank from '@oss-idle/shared/display/rank';
import {
	isFirst,
	rankTier,
	rankTierGradient,
} from '@oss-idle/shared/display/rankTier';

/** The global rank, big and faint behind the user card, in its tier. */
export default function GlobalRank({ globalRank, percent }: {
	globalRank?: number;
	percent?: number;
}) {
	if (!globalRank) return null;
	const tier = rankTier(globalRank, percent);
	const first = !!tier && isFirst(globalRank);
	const className = [
		'game__user-rank', tier && 'is-tiered', first && 'is-first',
	].filter(Boolean).join(' ');
	return (
		<span
			className={className}
			style={tier && !first ? { backgroundImage: rankTierGradient(tier) } : undefined}
		>
			{rank(globalRank)}
		</span>
	);
}
