import {
	type Group,
	isAdmin,
} from '@oss-idle/shared/groups';
import { useLingui } from '@lingui/react/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { osuUserUrl } from '@oss-idle/shared/osu/profile';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import OutLink from '../OutLink';
import FriendButton from './FriendButton';
import ProfileMenu from './ProfileMenu';

/** The bar under a profile's stats: the friend pill, on someone else's
 *  profile the ⋮ menu, then the osu! profile link. */
export default function ProfileSocialBar({ userId, characterId, name, restricted, groups }: {
	userId: number;
	characterId: number;
	name: string;
	restricted: boolean;
	groups: Group[];
}) {
	const { t } = useLingui();
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
			<OutLink
				href={osuUserUrl(userId)}
				target='_blank'
				className='character__osu-link'
				label={t`osu! profile`}
			>
				<FontAwesomeIcon icon={faArrowUpRightFromSquare} />
			</OutLink>
		</div>
	);
}
