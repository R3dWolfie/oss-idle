import { useLingui } from '@lingui/react/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	faComment,
	faCommentSlash,
	faLock,
	faLockOpen,
	faTrash,
} from '@fortawesome/free-solid-svg-icons';
import useAsync from '@oss-idle/shared/hooks/useAsync';
import { useAdmin } from '../../hooks/useAdmin';
import {
	getStanding,
	liftRestriction,
	liftSilence,
} from '../../api/restrictions';
import type { ProfileDialog } from './ProfileMenuDialog';

const reload = () => window.location.reload();
const lift = (action: (userId: number) => Promise<unknown>, userId: number) =>
	() => void action(userId).then(reload);

/** The moderators' part of the profile ⋮ menu: silence and restrict or lift them, and account
 *  deletion for admins. */
export default function SanctionItems({ userId, restricted, onPick }: {
	userId: number;
	restricted: boolean;
	onPick: (dialog: ProfileDialog) => void;
}) {
	const { t } = useLingui();
	const admin = useAdmin();
	const standing = useAsync(() => getStanding(userId), [userId]);
	const silenced = !!standing && (standing.silenced || !!standing.silencedUntil);

	return <>
		{silenced
			? <button type='button' className='profile-menu__item' onClick={lift(liftSilence, userId)}>
				<FontAwesomeIcon icon={faComment} />
				{t`Lift silence`}
			</button>
			: <button type='button' className='profile-menu__item' onClick={() => onPick('silence')}>
				<FontAwesomeIcon icon={faCommentSlash} />
				{t`Silence`}
			</button>}
		{restricted
			? <button type='button' className='profile-menu__item' onClick={lift(liftRestriction, userId)}>
				<FontAwesomeIcon icon={faLockOpen} />
				{t`Lift restriction`}
			</button>
			: <button type='button' className='profile-menu__item' onClick={() => onPick('restrict')}>
				<FontAwesomeIcon icon={faLock} />
				{t`Restrict`}
			</button>}
		{admin && <button type='button' className='profile-menu__item' onClick={() => onPick('delete')}>
			<FontAwesomeIcon icon={faTrash} />
			{t`Delete account`}
		</button>}
	</>;
}
