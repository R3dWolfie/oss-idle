import './TopPlays.css';
import rank from '@osu-idle/shared/display/rank';
import type { getTopPlays } from '../../api/rankings';
import ScoreRow from '../../components/score/ScoreRow';
import Pager from '../../components/leaderboard/Pager';
import RankingsNav from './RankingsNav';
import LeaderboardFilters from '../../components/leaderboard/LeaderboardFilters';
import { useFriendsFilter } from '../../components/leaderboard/useFriendsFilter';

type Plays = Awaited<ReturnType<typeof getTopPlays>>;

export default function PlaysRankings({ page, plays }: {
	page: number,
	plays: Plays,
}) {
	const friends = useFriendsFilter();
	return (
		<main>
			<RankingsNav current={'top plays'} />
			{friends && <LeaderboardFilters filters={[friends]} />}
			<div className='page-contents'>
				{plays.map((play, r) => <div key={play.score.id} className='top-plays__row'>
					<span className='top-plays__rank'>{rank(r + 1 + ((page - 1) * 50))}</span>
					<ScoreRow score={play.score} beatmap={play.beatmap} player={play.character} />
				</div>)}
				<Pager page={page} hasNext={plays.length === 50} />
			</div>
		</main>
	);
}
