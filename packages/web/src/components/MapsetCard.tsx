import { ph } from '@lingui/core/macro';
import './MapsetCard.css';
import { Trans } from '@lingui/react/macro';
import { dateAgo } from '@osu-idle/shared/display/ago';
import { bignum } from '@osu-idle/shared/display/num';
import type { MapCover } from '@osu-idle/shared/beatmap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlayCircle } from '@fortawesome/free-solid-svg-icons';
import { coverBackground } from '../api/maps';
import Link from './Link';

export type Mapset = MapCover & {
	title: string;
	artist: string;
	creator: string;
	plays: string | null;
	rankedAt: string | null;
};

/** osu!'s beatmapset panel: cover, title, artist, mapper, plays and when it was ranked. */
export default function MapsetCard({ mapset }: { mapset: Mapset }) {
	return (
		<Link to='/maps/$id' params={{ id: String(mapset.id) }} className='list__beatmap'>
			<div
				className='list__beatmap_background'
				style={{ backgroundImage: coverBackground(mapset, 'list') }}
			></div>
			<div className='list__beatmap_safe'>
				<div
					className='list__beatmap_foreground'
					style={{ backgroundImage: coverBackground(mapset, 'list') }}
				>
					<div className='list__beatmap_contents'>
						<span className='list__beatmap_title'>{mapset.title}</span>
						<span className='list__beatmap_artist'><Trans>by {ph({ artist: mapset.artist })}</Trans></span>
						<span className='list__beatmap_creator'>
							<Trans>mapped by {ph({ creator: mapset.creator })}</Trans>
						</span>
						<span className='list__beatmap_plays'>
							<FontAwesomeIcon icon={faPlayCircle}/> {bignum(mapset.plays)}
						</span>
						<div className='list__beatmap_bottom'>
							<span className='list__beatmap_capsule'><Trans>Ranked</Trans></span>
							<span className='list__beatmap_ago'>{dateAgo(mapset.rankedAt)}</span>
						</div>
					</div>
				</div>
			</div>
			<div className='list__beatmap_right'></div>
		</Link>
	);
}
