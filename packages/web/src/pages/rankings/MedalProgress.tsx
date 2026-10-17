import '../../components/leaderboard/MedalProgress.css';
import MedalBoardTabs from '../../components/leaderboard/MedalBoardTabs';
import MedalProgressCard from '../../components/leaderboard/MedalProgressCard';
import type { getProgressOverview } from '../../api/rankings';
import RankingsNav from './RankingsNav';

/** Every medal line, with the players furthest along it. */
export default function MedalProgress({ lines }: {
	lines: Awaited<ReturnType<typeof getProgressOverview>>,
}) {
	return (
		<main>
			<RankingsNav current={'medals'} />
			<div className='page-contents'>
				<MedalBoardTabs current='progress' />
				<div className='medal-progress'>
					{lines.map(l => <MedalProgressCard key={l.line} line={l.line} goals={l.goals} rows={l.rows} />)}
				</div>
			</div>
		</main>
	);
}
