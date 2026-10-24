import type { ReactNode } from 'react';
import rank from '@oss-idle/shared/display/rank';
import {
	isFirst,
	rankTier,
	rankTierGradient,
} from '@oss-idle/shared/display/rankTier';
import { useLingui } from '@lingui/react/macro';
import { ph } from '@lingui/core/macro';
import './RankArea.css';

/** One profile rank, with the highest rank reached on its board on hover. */
export default function RankArea({ label, current, highest, percent }: {
	label: ReactNode;
	current?: number;
	highest?: { rank: number; at: number };
	/** share of players at or above `current` (0..1), colours it by tier */
	percent?: number;
}) {
	const { t, i18n } = useLingui();
	const date = highest ? i18n.date(new Date(highest.at), { dateStyle: 'long' }) : '';
	const tier = rankTier(current, percent);
	const first = tier && isFirst(current);
	const tint = tier && !first ? { backgroundImage: rankTierGradient(tier) } : undefined;
	const classes = [
		'character__ranks-num', tier && `rank-area__num--${tier}`, first && 'rank-area__num--first',
	].filter(Boolean).join(' ');
	return (
		<div className='character__ranks-area rank-area'>
			<div className='character__ranks-label'>{label}</div>
			<div className={classes} style={tint}>
				{rank(current)}
			</div>
			{highest && (
				<div className='rank-area__tooltip'>
					{t`Highest rank: ${ph({ rank: rank(highest.rank) })} on ${ph({ date })}`}
				</div>
			)}
		</div>
	);
}
