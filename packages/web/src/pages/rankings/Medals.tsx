import { useNavigate } from '@tanstack/react-router';
import CountryFilter from '../../components/leaderboard/CountryFilter';
import MedalBoardTabs from '../../components/leaderboard/MedalBoardTabs';
import PlayerMedalLeaderboard from '../../components/leaderboard/PlayerMedalLeaderboard';
import type { getMedalRanking } from '../../api/rankings';
import RankingsNav from './RankingsNav';

type Players = Awaited<ReturnType<typeof getMedalRanking>>;

export default function MedalRankings({ page, country, players }: {
	page: number,
	country?: string,
	players: Players,
}) {
	const navigate = useNavigate();
	return (
		<main>
			<RankingsNav current={'medals'} />
			<CountryFilter selected={country} onSelect={value => navigate({
				to: '/rankings/medals', search: prev => ({
					...prev, country: value || undefined, page: 1,
				}),
			})} />

			<div className='page-contents'>
				<MedalBoardTabs current='medals' />
				<PlayerMedalLeaderboard page={page} players={players} />
			</div>
		</main>
	);
}
