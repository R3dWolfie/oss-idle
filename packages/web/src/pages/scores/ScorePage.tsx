import './ScorePage.css';
import { Trans } from '@lingui/react/macro';
import { ph } from '@lingui/core/macro';
import { JUDGEMENT } from '@osu-idle/shared/judgement';
import { showsDivine } from '@osu-idle/shared/rebirth';
import {
	difficultyColor,
	difficultyTextColor,
} from '@osu-idle/shared/display/difficulty';
import accuracy from '@osu-idle/shared/display/accuracy';
import num from '@osu-idle/shared/display/num';
import rank from '@osu-idle/shared/display/rank';
import type { getScore } from '../../api/scores';
import { coverBackground } from '../../api/maps';
import Link from '../../components/Link';
import Flag from '../../components/Flag';
import ProfilePicture from '../../components/ProfilePicture';
import RateBadge from '../../components/score/RateBadge';
import ScoreDial from '../../components/score/ScoreDial';
import ScoreTower from '../../components/score/ScoreTower';
import { JUDGEMENT_COLUMNS } from '../beatmaps/judgementColumns';
import { i18n } from '../../i18n';

/** osu!web's score page (scores-show): the map, the grade dial and score, then the stats. */
export default function ScorePage({ show }: { show: Awaited<ReturnType<typeof getScore>> }) {
	const {
		score, beatmap, beatmapset, player,
	} = show;
	const stars = Number(beatmap.sr);
	const judgements = [
		...showsDivine(score.judgements.DIVINE) ? [{
			judgement: JUDGEMENT.DIVINE, label: 'DIVINE', 
		}] : [],
		...JUDGEMENT_COLUMNS,
	];
	const mapLink = {
		to: '/maps/$id', params: { id: String(beatmapset.id) }, search: { diff: beatmap.id },
	} as const;

	return <main>
		<div className='score-beatmap'>
			<h1 className='score-beatmap__title'>
				<Link {...mapLink}>
					{beatmapset.title} <span className='score-beatmap__artist'>
						<Trans>by {ph({ artist: beatmapset.artist })}</Trans>
					</span>
				</Link>
			</h1>
			<div className='score-beatmap__detail'>
				<span className='score-beatmap__stars' style={{
					backgroundColor: difficultyColor(stars), color: difficultyTextColor(stars), 
				}}>
					★ {stars.toFixed(2)}
				</span>
				<b>{beatmap.version}</b>
				<span><Trans>mapped by <b>{ph({ creator: beatmapset.creator })}</b></Trans></span>
			</div>
		</div>

		<div className='score-info' style={{ backgroundImage: coverBackground(beatmapset, 'cover') }}>
			<div className='score-info__item'><ScoreTower grade={score.grade} /></div>
			<div className='score-info__item score-info__item--dial'>
				<ScoreDial accuracy={score.accuracy} grade={score.grade} />
			</div>
			<div className='score-info__item score-info__item--player'>
				<div className='score-player__mods'><RateBadge rate={score.rate} /></div>
				<div className='score-player__score'>{num(score.score)}</div>
				<div className='score-player__row--player'>
					<span><Trans>Played by</Trans></span>
					<strong>{player.name}</strong>
					<span><Trans>Submitted on</Trans></span>
					<strong>
						{new Date(score.playedAt).toLocaleString(i18n.locale, {
							dateStyle: 'long', timeStyle: 'short', 
						})}
					</strong>
				</div>
				<div className='score-player__row--rank'>
					<div className='score-player__rank score-player__rank--label'><Trans>Global Rank</Trans></div>
					<div className='score-player__rank score-player__rank--value'>{rank(show.rank)}</div>
				</div>
			</div>
		</div>

		<div className='score-stats'>
			<div className='score-stats__group score-stats__group--user'>
				<Link to='/c/$id' params={{ id: String(player.id) }} className='score-user'>
					<ProfilePicture avatarUrl={player.avatarUrl} className='score-user__avatar' />
					<div>
						<div className='score-user__name'>{player.name}</div>
						<Flag country={player.country} />
					</div>
				</Link>
			</div>
			<div className='score-stats__group score-stats__group--stats'>
				<div className='score-stats__row'>
					<div className='score-stats__stat'>
						<div className='score-stats__label'><Trans>Accuracy</Trans></div>
						<div className={`score-stats__value ${score.accuracy === 1 ? 'score-stats__value--perfect' : ''}`}>
							{accuracy(score.accuracy)}
						</div>
					</div>
					<div className='score-stats__stat'>
						<div className='score-stats__label'><Trans>Max Combo</Trans></div>
						<div className={`score-stats__value ${score.pfc ? 'score-stats__value--perfect' : ''}`}>
							{num(score.maxCombo)}x
						</div>
					</div>
					<div className='score-stats__stat'>
						<div className='score-stats__label'>pp</div>
						<div className='score-stats__value'>{num(Math.round(score.pp))}</div>
					</div>
				</div>
				<div className='score-stats__row'>
					{judgements.map(j => <div key={j.judgement} className='score-stats__stat'>
						<div className='score-stats__label'>{j.label}</div>
						<div className='score-stats__value'>{num(score.judgements[j.judgement])}</div>
					</div>)}
				</div>
			</div>
		</div>
	</main>;
}
