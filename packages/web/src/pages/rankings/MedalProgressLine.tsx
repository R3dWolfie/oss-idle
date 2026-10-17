import '../../components/leaderboard/PlayerLeaderboard.css';
import '../../components/leaderboard/MedalProgress.css';
import { useNavigate } from '@tanstack/react-router';
import { ph } from '@lingui/core/macro';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import CountryFilter from '../../components/leaderboard/CountryFilter';
import MedalBoardTabs from '../../components/leaderboard/MedalBoardTabs';
import MedalLineIcon from '../../components/leaderboard/MedalLineIcon';
import Pager from '../../components/leaderboard/Pager';
import Flag from '../../components/Flag';
import Link from '../../components/Link';
import rank from '@osu-idle/shared/display/rank';
import type { getProgressRanking } from '../../api/rankings';
import {
	LINE_NAMES,
	lineStanding,
	lineValue,
} from '../../components/leaderboard/medalLine';
import RankingsNav from './RankingsNav';

/** The players furthest along one medal line, toward their next medal. */
export default function MedalProgressLine({ line, page, country, board }: {
	line: string,
	page: number,
	country?: string,
	board: Awaited<ReturnType<typeof getProgressRanking>>,
}) {
	const { i18n } = useLingui();
	const navigate = useNavigate();
	return (
		<main>
			<RankingsNav current={'medals'} />
			<CountryFilter selected={country} onSelect={value => navigate({
				to: '/rankings/medals/progress/$line', params: { line }, search: prev => ({
					...prev, country: value || undefined, page: 1,
				}),
			})} />

			<div className='page-contents'>
				<MedalBoardTabs current='progress' />
				<div className='medal-progress__head'>
					{LINE_NAMES[line] ? i18n._(LINE_NAMES[line]) : line}
					<div className='medal-line'>
						{board.goals.map(g => <MedalLineIcon key={g.id} id={g.id} />)}
					</div>
				</div>
				<div className='player__lb'>
					<div className='player__lb_scroll'>
						<table className='player__lb_listing'>
							<thead>
								<tr>
									<th></th>
									<th></th>
									<th><Trans>Next medal</Trans></th>
									<th className='current'>{LINE_NAMES[line] ? i18n._(LINE_NAMES[line]) : line}</th>
									<th></th>
								</tr>
							</thead>
							<tbody>
								{board.rows.map((row, r) => {
									const { reached, next } = lineStanding(board.goals, row.value);
									return <tr key={row.id}>
										<td>{rank(r + 1 + ((page - 1) * 50))}</td>
										<td className='main'><div className='player__lb_listing_main'>
											<Flag country={row.country} />
											<Link to='/c/$id' params={{ id: String(row.id) }}>{row.name}</Link>
										</div></td>
										<td className='dimmed'>{next && <div className='medal-progress__next'>
											<div className='medal-progress__bar'>
												{row.current < row.value && <div
													className='is-best'
													style={{ width: `${row.value / next.goal * 100}%` }}
												/>}
												<div style={{ width: `${row.current / next.goal * 100}%` }} />
											</div>
											<MedalLineIcon id={next.id} lit={false} />
										</div>}</td>
										<td className='current'>
											{lineValue(line, row.value)}
											{row.current < row.value && <div className='medal-progress__now'>
												<Trans>now {ph({ now: lineValue(line, row.current) })}</Trans>
											</div>}
										</td>
										<td>{reached && <MedalLineIcon id={reached.id} />}</td>
									</tr>;
								})}
							</tbody>
						</table>
					</div>
					<Pager page={page} hasNext={board.rows.length === 50} />
				</div>
			</div>
		</main>
	);
}
