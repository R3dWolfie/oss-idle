import {
	GROUP_BADGE,
	type Group,
} from '@oss-idle/shared/groups';
import Link from '../../components/Link';
import type { Friend } from './Friends';

/** One friend in osu!web's compact view: the name, a role-coloured bar, a pink
 *  outline when it's mutual. */
export default function FriendChip({ friend }: {
	friend: Pick<Friend, 'userId'> & {
		groups: Group[],
		mutual?: boolean,
		character: Pick<Friend['character'], 'id' | 'name'>,
	},
}) {
	const [group] = friend.groups;
	return (
		<Link
			to='/c/$id'
			params={{ id: String(friend.character.id) }}
			className='friend-chip'
			data-mutual={Boolean(friend.mutual)}
			style={group && { '--role': GROUP_BADGE[group].colour } as React.CSSProperties}
		>
			{friend.character.name}
		</Link>
	);
}
