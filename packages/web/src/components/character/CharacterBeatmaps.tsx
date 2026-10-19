import { Trans } from '@lingui/react/macro';
import useAsync from '@oss-idle/shared/hooks/useAsync';
import num from '@oss-idle/shared/display/num';
import {
	getCharacterNbRankedMaps,
	getCharacterRankedMaps,
} from '../../api/characters';
import { useShowMore } from '../../hooks/useShowMore';
import ShowMoreLink from '../ShowMoreLink';
import MapsetCard from '../MapsetCard';

/** osu!'s profile beatmaps: the ranked maps the player proposed, latest first. */
export default function CharacterBeatmaps({ id }: { id: string }) {
	const count = useAsync(() => getCharacterNbRankedMaps(id), [id]);
	const ranked = useShowMore(page => getCharacterRankedMaps(id, page), [id]);
	if (!count) return null;

	return <div className='character__block'>
		<div className='character__block-title'><Trans>Beatmaps</Trans></div>
		<div className='character__block-section'>
			<div className='character__block-section-title'>
				<Trans>Ranked Beatmaps</Trans>
				<div className='character__block-section-title-count'>{num(count)}</div>
			</div>
			<div className='list__beatmap-container'>
				{ranked.items?.map(mapset => <MapsetCard key={mapset.id} mapset={mapset} />)}
			</div>
			<ShowMoreLink {...ranked} onClick={ranked.more} />
		</div>
	</div>;
}
