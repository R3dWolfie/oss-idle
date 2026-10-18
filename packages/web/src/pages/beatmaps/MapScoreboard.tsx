import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import useAsync from '@osu-idle/shared/hooks/useAsync';
import Link from '../../components/Link';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { getMapBoard } from '../../api/maps';
import TopScoreCard from './TopScoreCard';
import ScoreboardRow from './ScoreboardRow';
import { JUDGEMENT_COLUMNS } from './judgementColumns';

export type Board = 'global' | 'country' | 'friends';

/** osu!'s scoreboard: global, country or friends, the #1's card, then the table. */
export default function MapScoreboard({ setId, beatmapId, board }: {
	setId: number;
	beatmapId: number;
	board: Board;
}) {
	const { t } = useLingui();
	const me = useCurrentUser();
	const country = board === 'country' ? me?.country : undefined;
	const rows = useAsync(() => getMapBoard(beatmapId, {
		country, friends: board === 'friends',
	}), [beatmapId, board, country]);
	const tabs: { board: Board; label: string }[] = [
		{
			board: 'global', label: t`Global Ranking`,
		},
		{
			board: 'country', label: t`Country Ranking`,
		},
		{
			board: 'friends', label: t`Friend Ranking`,
		},
	];
	const signedOut = board !== 'global' && !me;

	return <section className='mapset__board'>
		<nav className='mapset__tabs'>
			{tabs.map(tab => <Link
				key={tab.board}
				to='/maps/$id'
				params={{ id: String(setId) }}
				search={prev => ({
					...prev, board: tab.board,
				})}
				resetScroll={false}
				className={`mapset__tab ${tab.board === board ? 'active' : ''}`}
			>{tab.label}</Link>)}
		</nav>
		{signedOut && <p className='mapset__empty'><Trans>Sign in to see this ranking.</Trans></p>}
		{!signedOut && !rows && <p className='mapset__empty'><Trans>Loading…</Trans></p>}
		{!signedOut && rows && !rows.length && <p className='mapset__empty'>
			<Trans>No one has set a score on this difficulty yet.</Trans>
		</p>}
		{!signedOut && !!rows?.length && <>
			<TopScoreCard row={rows[0]} />
			<table className='mapset__table'>
				<thead>
					<tr>
						<th><Trans>Rank</Trans></th>
						<th />
						<th><Trans>Score</Trans></th>
						<th><Trans>Accuracy</Trans></th>
						<th><Trans>Player</Trans></th>
						<th><Trans>Max Combo</Trans></th>
						{JUDGEMENT_COLUMNS.map(j => <th key={j.judgement}>{j.label}</th>)}
						<th>pp</th>
						<th><Trans>Time</Trans></th>
						<th><Trans>Mods</Trans></th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row, i) => <ScoreboardRow key={row.score.id} row={row} rank={i + 1} />)}
				</tbody>
			</table>
		</>}
	</section>;
}
