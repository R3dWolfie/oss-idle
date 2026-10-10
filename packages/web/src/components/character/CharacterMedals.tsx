import { ph } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import useAsync from '@osu-idle/shared/hooks/useAsync';
import {
	MedalCategories,
	MEDAL_LINES,
	MEDALS,
	medalById,
} from '@osu-idle/shared/achievements/catalogue';
import { medalCategoryName } from '@osu-idle/shared/display/medals';
import { getCharacterMedals } from '../../api/characters';
import ProfileMedal from './ProfileMedal';
import './CharacterMedals.css';

/** osu!'s profile medals: every medal by category, one series per line. */
export default function CharacterMedals({ id }: { id: string }) {
	const medals = useAsync(() => getCharacterMedals(id), [id]);
	if (!medals) return null;
	const held = new Map(medals.map(m => [m.id, m.unlockedAt]));

	return <div className='character__block'>
		<div className='character__block-title'><Trans>Medals</Trans></div>
		<div className='profile-medals__count'>
			<Trans>{ph({ unlocked: medals.length })} / {ph({ total: MEDALS.length })} unlocked</Trans>
		</div>
		{MedalCategories.map(category => <div key={category} className='character__block-section'>
			<div className='character__block-section-title'>{medalCategoryName(category)}</div>
			<div className='profile-medals__lines'>
				{MEDAL_LINES[category].map(line => <div key={line[0]} className='profile-medals__line'>
					{line.flatMap(medalId => {
						const medal = medalById(medalId);
						return medal
							? [<ProfileMedal key={medalId} medal={medal} unlockedAt={held.get(medalId)} />]
							: [];
					})}
				</div>)}
			</div>
		</div>)}
	</div>;
}
