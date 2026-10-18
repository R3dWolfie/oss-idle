import type { InferResponseType } from 'hono/client';
import { rpc } from '../../api/client';
import './ScoreRow.css';
import { dateAgo } from '@osu-idle/shared/display/ago';
import accuracy from '@osu-idle/shared/display/accuracy';
import num from '@osu-idle/shared/display/num';
import ScoreLink from './ScoreLink';
import Grade from './Grade';
import RateBadge from './RateBadge';
import Flag from '../Flag';
import Link from '../Link';

type Score = InferResponseType<(typeof rpc.v1.scores[':id'])['$get'], 200>;
type Beatmap = Pick<InferResponseType<(typeof rpc.v1.beatmap[':id'])['$get'], 200>, 'title' | 'artist' | 'version'>;

export default function ScoreRow({
	score, beatmap, player,
}: {
	score: Score,
	beatmap: Beatmap,
	player?: {
		id: number,
		name: string,
		country: string,
	},
}) {

	return (<div className='score__row'>
		<ScoreLink id={score.id} label={beatmap.title} />
		<div className='score__top'>
			<div className='score__grade'><Grade grade={score.grade} /></div>
			<div className='score__title'>
				<div className='score__md'>{beatmap.title} by {beatmap.artist}</div>
				<div className='score__mb'>
					{player && <div className='score__player'>
						<Flag country={player.country} />
						<Link to='/c/$id' params={{ id: String(player.id) }}>{player.name}</Link>
					</div>}
					<b>{beatmap.version}</b> <span>{dateAgo(score.playedAt)}</span></div>
			</div>
			<div className='score__acc'><RateBadge rate={score.rate} /> {accuracy(score.accuracy)}</div>
		</div>
		<div className='score__bottom'>
			<div className='score__pp-flow'>
				<div className='score__pp-container'>
					<div className='score__pp'>
						{num(score.pp)}<span className="score__pp_unit">pp</span>
					</div>
				</div>
			</div>
		</div>
	</div>);
}