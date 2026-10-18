import { useCurrentUser } from '../../hooks/useCurrentUser';
import FriendButton from './FriendButton';
import ProfileMenu from './ProfileMenu';

/** The bar under a profile's stats: the friend pill, and on someone else's
 *  profile the ⋮ menu. */
export default function ProfileSocialBar({ userId, name, restricted }: {
	userId: number;
	name: string;
	restricted: boolean;
}) {
	const me = useCurrentUser();
	const other = !!me && me.id !== userId;
	return (
		<div className='character__socialmeta'>
			<FriendButton userId={userId} interactive={other} />
			{other && <ProfileMenu userId={userId} name={name} restricted={restricted} />}
		</div>
	);
}
