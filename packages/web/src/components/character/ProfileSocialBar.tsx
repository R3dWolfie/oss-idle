import {
	type Group,
	isAdmin,
} from '@oss-idle/shared/groups';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import FriendButton from './FriendButton';
import ProfileMenu from './ProfileMenu';

/** The bar under a profile's stats: the friend pill, and on someone else's
 *  profile the ⋮ menu. */
export default function ProfileSocialBar({ userId, characterId, name, restricted, groups }: {
	userId: number;
	characterId: number;
	name: string;
	restricted: boolean;
	groups: Group[];
}) {
	const me = useCurrentUser();
	const other = !!me && me.id !== userId;
	return (
		<div className='character__socialmeta'>
			<FriendButton userId={userId} interactive={other} />
			{other && <ProfileMenu
				userId={userId}
				characterId={characterId}
				name={name}
				restricted={restricted}
				sanctionable={!isAdmin(groups)}
			/>}
		</div>
	);
}
