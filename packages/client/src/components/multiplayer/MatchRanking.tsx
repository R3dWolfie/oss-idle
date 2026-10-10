import { Trans } from '@lingui/react/macro';
import { GUEST_AVATAR_URL } from '@osu-idle/shared/osu/profile';
import MatchScoreCard from './MatchScoreCard';
import usePlayers from './usePlayers';
import type { Ranking } from './useMatchRanking';

/** The match's standings on the result screen: a tab per player, and the winner. */
export default function MatchRanking({ ranking }: { ranking: Ranking }) {
	const players = usePlayers();
	const { results, final, viewed, view } = ranking;
	const winner = final ? players.get(results[0]?.characterId) : undefined;

	return (
		<div className="mp-ranking">
			{results.map((r, i) => (
				<MatchScoreCard
					key={r.characterId}
					player={players.get(r.characterId)}
					score={r.score}
					combo={r.combo}
					position={i + 1}
					failed={r.failed}
					self={r.characterId === viewed}
					onClick={final && !r.failed ? () => view(r.characterId) : undefined}
				/>
			))}
			{final && (
				<div className="mp-winner">
					<div className="mp-winner__label"><Trans>WINNER</Trans></div>
					<img className="mp-winner__avatar" src={winner?.avatarUrl ?? GUEST_AVATAR_URL} alt="" />
				</div>
			)}
		</div>
	);
}
