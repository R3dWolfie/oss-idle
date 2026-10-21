import { Trans } from '@lingui/react/macro';
import useAsync from '@oss-idle/shared/hooks/useAsync';
import num from '@oss-idle/shared/display/num';
import {
	getCharacterBestPP,
	getCharacterFirstPlaces,
	getCharacterNbFirstPlaces,
	getCharacterRecent,
} from '../../api/characters';
import { useShowMore } from '../../hooks/useShowMore';
import ShowMoreLink from '../ShowMoreLink';
import ScoreRow from '../score/ScoreRow';

/** The profile's Ranks block: best performance, first places and recent scores. */
export default function CharacterTopRanks({ id, countplayed }: {
	id: string;
	countplayed?: number;
}) {
	const bestpp = useShowMore(page => getCharacterBestPP(id, page), [id]);
	const countfirstplaces = useAsync(() => getCharacterNbFirstPlaces(id), [id]);
	const firstplaces = useShowMore(page => getCharacterFirstPlaces(id, page), [id]);
	const recentscores = useShowMore(page => getCharacterRecent(id, page), [id]);

	return <div className='character__block character__block-skills'>
		<div className='character__block-title'><Trans>Ranks</Trans></div>
		<div className='character__block-section'>
			<div className='character__block-section-title'>
				<Trans>Best Performance</Trans>
				<div className='character__block-section-title-count'>
					{num(Math.min(200, countplayed ?? 0))}
				</div>
			</div>
			<div className='character__best_pp'>
				{bestpp.items?.map(score => (
					<ScoreRow key={score.best_pp.id} score={score.best_pp} beatmap={score.beatmap} />
				))}
			</div>
			<ShowMoreLink {...bestpp} onClick={bestpp.more} />
		</div>
		<div className='character__block-section'>
			<div className='character__block-section-title'>
				<Trans>First Place Ranks</Trans>
				<div className='character__block-section-title-count'
				>{num(countfirstplaces)}
				</div>
			</div>
			<div className='character__first_places'>
				{firstplaces.items?.map(score => (
					<ScoreRow key={score.first_place.id} score={score.first_place} beatmap={score.beatmap} />
				))}
			</div>
			<ShowMoreLink {...firstplaces} onClick={firstplaces.more} />
		</div>
		<div className='character__block-section'>
			<div className='character__block-section-title'>
				<Trans>Recent scores</Trans>
				<div className='character__block-section-title-count'>
					{num(recentscores.items?.length)}
				</div>
			</div>
			<div className='character__first_places'>
				{recentscores.items?.map(score => (
					<ScoreRow key={score.score.id} score={score.score} beatmap={score.beatmap} />
				))}
			</div>
			<ShowMoreLink {...recentscores} onClick={recentscores.more} />
		</div>
	</div>;
}
