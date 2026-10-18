import { isAdmin } from '@osu-idle/shared/admin';
import Link from '../../components/Link';
import type { Friend } from './Friends';

/** One friend in osu!web's compact view: the name, a role-coloured bar, a pink
 *  outline when it's mutual. */
export default function FriendChip({ friend }: {
	friend: Pick<Friend, 'userId'> & {
		mutual?: boolean,
		character: Pick<Friend['character'], 'id' | 'name'>,
	},
}) {
	return (
		<Link
			to='/c/$id'
			params={{ id: String(friend.character.id) }}
			className='friend-chip'
			data-mutual={Boolean(friend.mutual)}
			data-role={isAdmin(friend.userId) ? 'admin' : 'player'}
		>
			{friend.character.name}
		</Link>
	);
}
