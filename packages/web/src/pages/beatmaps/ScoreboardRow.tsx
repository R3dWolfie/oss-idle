import num from '@osu-idle/shared/display/num';
import accuracy from '@osu-idle/shared/display/accuracy';
import { dateAgo } from '@osu-idle/shared/display/ago';
import Link from '../../components/Link';
import Flag from '../../components/Flag';
import ScoreLink from '../../components/score/ScoreLink';
import Grade from '../../components/score/Grade';
import RateBadge from '../../components/score/RateBadge';
import type { BoardRow } from '../../api/maps';
import { JUDGEMENT_COLUMNS } from './judgementColumns';

/** One line of the map's score table. */
export default function ScoreboardRow({ row, rank }: { row: BoardRow; rank: number }) {
	const { score, player } = row;
	return <tr className='mapset__row'>
		<td className='mapset__rank'>
			<ScoreLink id={score.id} label={`#${rank}`} />
			#{rank}
		</td>
		<td><Grade grade={score.grade} /></td>
		<td className='mapset__score'>{num(score.score)}</td>
		<td>{accuracy(score.accuracy)}</td>
		<td><div className='mapset__player'>
			<Flag country={player.country} />
			<Link to='/c/$id' params={{ id: String(player.id) }}>{player.name}</Link>
		</div></td>
		<td>{num(score.maxCombo)}x</td>
		{JUDGEMENT_COLUMNS.map(j => {
			const count = score.judgements[j.judgement];
			return <td key={j.judgement} className={count ? '' : 'zero'}>{num(count)}</td>;
		})}
		<td>{num(score.pp)}</td>
		<td className='mapset__when'>{dateAgo(score.playedAt)}</td>
		<td><RateBadge rate={score.rate} /></td>
	</tr>;
}
