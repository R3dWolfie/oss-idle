import './RankedMaps.css';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import Link from '../../components/Link';
import MapsetCard from '../../components/MapsetCard';
import MapsNav from './MapsNav';
import {
	type getAllMaps,
	type getPopularMaps,
} from '../../api/maps';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	faCaretDown,
	faCaretUp,
} from '@fortawesome/free-solid-svg-icons';

export type MapSort = 'date' | 'plays';
export type MapDir = 'asc' | 'desc';

type Mapsets = Awaited<ReturnType<typeof getAllMaps>> | Awaited<ReturnType<typeof getPopularMaps>>;

export default function RankedMaps({ sort, dir, mapsets }: {
	sort: MapSort,
	dir: MapDir,
	mapsets: Mapsets,
}) {
	const { t } = useLingui();

	const label: Record<MapSort, string> = {
		date: t`Ranked`, plays: t`Plays`, 
	};

	return (
		<main>
			<MapsNav current='listing' />
			<div className='list__beatmap_sort'>
				<span><Trans>Sort by</Trans></span>
				{(['date', 'plays'] as const).map(type => {
					const current = type === sort;
					const nextDir: MapDir = current ? (dir === 'asc' ? 'desc' : 'asc') : dir;
					return (<Link
						className={`${current ? 'current' : ''} ${dir === 'asc' ? 'asc' : 'desc'}`}
						to='/maps'
						search={{
							sort: type, dir: nextDir, 
						}}
					>
						{label[type]}
						<FontAwesomeIcon icon={dir === 'asc' ? faCaretUp : faCaretDown} />
					</Link>);
				})}
			</div>
			<div className="page-contents">
				<div className='list__beatmap-container'>
					{mapsets.map(mapset => <MapsetCard key={mapset.id} mapset={mapset} />)}
				</div>
			</div>
		</main>
	);
}
