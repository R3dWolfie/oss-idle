import './PlayerLeaderboard.css';
import Link from '../Link';
import Pager from './Pager';
import type { getMedalRanking } from '../../api/rankings';
import Flag from '../Flag';
import rank from '@osu-idle/shared/display/rank';
import num from '@osu-idle/shared/display/num';
import { MEDALS } from '@osu-idle/shared/achievements/catalogue';
import { Trans } from '@lingui/react/macro';

type Players = Awaited<ReturnType<typeof getMedalRanking>>;

export default function PlayerMedalLeaderboard({ page, players }: {
	page: number,
	players: Players,
}) {
	return (<div className='player__lb'>
		<div className='player__lb_scroll'>
			<table className='player__lb_listing'>
				<thead>
					<tr>
						<th></th>
						<th></th>
						<th><Trans>Play Count</Trans></th>
						<th><Trans>Medals</Trans></th>
						<th className='current'><Trans>Medal Score</Trans></th>
					</tr>
				</thead>
				<tbody>
					{players.map((player, r) => <tr key={player.character.id}>
						<td>{rank(r+1+((page - 1) * 50))}</td>
						<td className='main'><div className='player__lb_listing_main'>
							<Flag country={player.user.country} />
							<Link to='/c/$id' params={{ id: String(player.character.id) }}>{player.character.name}</Link>
						</div></td>
						<td className='dimmed'>{num(player.character_totals.playCount)}</td>
						<td className='dimmed'>{player.medals.held} / {MEDALS.length}</td>
						<td className='current'>{num(player.medals.score, 2)}</td>
					</tr>)}
				</tbody>
			</table>
		</div>
		<Pager page={page} hasNext={players.length === 50} />
	</div>);
}
