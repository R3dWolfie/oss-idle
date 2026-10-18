import { Trans } from '@lingui/react/macro';
import useAsync from '@osu-idle/shared/hooks/useAsync';
import num from '@osu-idle/shared/display/num';
import rank from '@osu-idle/shared/display/rank';
import { getCharacterStats } from '../api/characters';
import { useCurrentCharacter } from '../hooks/useCurrentCharacter';
import Link from './Link';
import ProfilePicture from './ProfilePicture';

/** The signed-in player's character at a glance, on top of the dashboard sidebar. */
export default function DashboardCharacter() {
	const character = useCurrentCharacter();
	const stats = useAsync(() => character && getCharacterStats(character.id), [character]);
	if (!character) return null;

	return <Link to='/c/$id' params={{ id: String(character.id) }} className='dashboard-character'>
		<ProfilePicture avatarUrl={character.avatarUrl} className='dashboard-character__avatar' />
		<div className='dashboard-character__body'>
			<div className='dashboard-character__name'>{character.name}</div>
			<div className='dashboard-character__stats'>
				<span><Trans>level</Trans> <b>{character.overallLevel}</b></span>
				{stats && <span><b>{rank(stats.globalRank)}</b></span>}
				{stats && <span><b>{num(Math.round(stats.pp))}</b>pp</span>}
			</div>
		</div>
	</Link>;
}
