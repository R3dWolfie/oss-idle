import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import { ph } from '@lingui/core/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlayCircle } from '@fortawesome/free-solid-svg-icons';
import { bignum } from '@osu-idle/shared/display/num';
import { dateAgo } from '@osu-idle/shared/display/ago';
import {
	difficultyColor,
	difficultyTextColor,
} from '@osu-idle/shared/display/difficulty';
import { osuSetUrl } from '@osu-idle/shared/beatmap';
import OutLink from '../../components/OutLink';
import {
	coverBackground,
	type MapDiff,
	type Mapset,
} from '../../api/maps';
import DifficultyPicker from './DifficultyPicker';
import BeatmapsetStats from './BeatmapsetStats';

/** osu!'s beatmap header: the cover, the difficulties, who made it, then its stats. */
export default function BeatmapsetHeader({ mapset, diff }: { mapset: Mapset; diff: MapDiff }) {
	const { t } = useLingui();
	const { set } = mapset;
	const osu = osuSetUrl(set.osuId);
	const cover = coverBackground({
		...set, background: diff.background,
	}, 'cover');
	return <div className='mapset__header'>
		<div className='mapset__cover' style={{ backgroundImage: cover }} />
		<div className='mapset__main'>
			<DifficultyPicker setId={set.id} diffs={mapset.diffs} current={diff.id} />
			<div className='mapset__version'>
				{diff.version}
				<span className='mapset__stars' style={{
					backgroundColor: difficultyColor(diff.sr), color: difficultyTextColor(diff.sr), 
				}}>
					★ {diff.sr.toFixed(2)}
				</span>
			</div>
			<div className='mapset__plays' title={t`plays`}>
				<FontAwesomeIcon icon={faPlayCircle} /> {bignum(diff.plays)}
			</div>
			<div className='mapset__title'>{set.title}</div>
			<div className='mapset__artist'>{set.artist}</div>
			<div className='mapset__mapper'>
				<Trans>mapped by <b>{ph({ creator: set.creator })}</b></Trans>
			</div>
			{osu && <div className='mapset__buttons'>
				<OutLink href={osu} target='_blank' className='mapset__button'>
					<Trans>osu! page</Trans>
				</OutLink>
			</div>}
		</div>
		<div className='mapset__side'>
			<div className='mapset__status'>
				<span className='mapset__status-badge'><Trans>ranked</Trans></span>
				{set.rankedAt && <span>{dateAgo(set.rankedAt)}</span>}
			</div>
			<BeatmapsetStats setId={set.id} diff={diff} />
		</div>
	</div>;
}
