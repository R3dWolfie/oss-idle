import '../../components/leaderboard/PlayerLeaderboard.css';
import { Trans } from '@lingui/react/macro';
import { countryName } from '@osu-idle/shared/display/country';
import rank from '@osu-idle/shared/display/rank';
import num from '@osu-idle/shared/display/num';
import accuracy from '@osu-idle/shared/display/accuracy';
import hitAccuracy from '@osu-idle/shared/osu/hitAccuracy';
import type { getCountryRanking } from '../../api/rankings';
import Flag from '../../components/Flag';
import Link from '../../components/Link';
import Pager from '../../components/leaderboard/Pager';
import { i18n } from '../../i18n';
import RankingsNav from './RankingsNav';

type Countries = Awaited<ReturnType<typeof getCountryRanking>>;

export default function CountryRankings({ page, countries }: {
	page: number,
	countries: Countries,
}) {
	return (
		<main>
			<RankingsNav current={'country'} />
			<div className='page-contents'>
				<div className='player__lb_scroll'>
					<table className='player__lb_listing'>
						<thead>
							<tr>
								<th></th>
								<th></th>
								<th><Trans>Active Players</Trans></th>
								<th><Trans>Play Count</Trans></th>
								<th><Trans>Accuracy</Trans></th>
								<th><Trans>Ranked Score</Trans></th>
								<th><Trans>Avg. Performance</Trans></th>
								<th className='current'><Trans>Performance</Trans></th>
							</tr>
						</thead>
						<tbody>
							{countries.map((country, r) => <tr key={country.country}>
								<td>{rank(r + 1 + ((page - 1) * 50))}</td>
								<td className='main'><div className='player__lb_listing_main'>
									<Flag country={country.country} />
									<Link to='/rankings/global' search={{
										page: 1, country: country.country,
									}}>{countryName(country.country, i18n.locale)}</Link>
								</div></td>
								<td className='dimmed'>{num(country.players)}</td>
								<td className='dimmed'>{num(country.playCount)}</td>
								<td className='dimmed'>{accuracy(hitAccuracy(country))}</td>
								<td className='dimmed'>{num(country.rankedScore)}</td>
								<td className='dimmed'>{num(Math.round(country.pp / country.players))}</td>
								<td className='current'>{num(Math.round(country.pp))}</td>
							</tr>)}
						</tbody>
					</table>
				</div>
				<Pager page={page} hasNext={countries.length === 50} />
			</div>
		</main>
	);
}
