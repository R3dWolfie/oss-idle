import { difficultyColor } from '@oss-idle/shared/display/difficulty';
import Link from '../../components/Link';
import type { MapDiff } from '../../api/maps';

/** One dot per difficulty, coloured by star rating, like osu!'s picker. */
export default function DifficultyPicker({ setId, diffs, current }: {
	setId: number;
	diffs: MapDiff[];
	current: number;
}) {
	return <div className='mapset__picker'>
		{diffs.map(d => <Link
			key={d.id}
			to='/maps/$id'
			params={{ id: String(setId) }}
			search={{ diff: d.id }}
			resetScroll={false}
			className={`mapset__picker-diff ${d.id === current ? 'active' : ''}`}
			title={`${d.version} (${d.sr.toFixed(2)}★)`}
		>
			<span style={{ backgroundColor: difficultyColor(d.sr) }} />
		</Link>)}
	</div>;
}
