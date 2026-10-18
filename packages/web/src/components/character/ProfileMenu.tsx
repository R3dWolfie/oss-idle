import './ProfileMenu.css';
import { useState } from 'react';
import { useLingui } from '@lingui/react/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	faBan,
	faEllipsisVertical,
	faLock,
	faLockOpen,
	faTrash,
	faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { isAdmin } from '@osu-idle/shared/admin';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { liftRestriction } from '../../api/restrictions';
import RestrictDialog from './RestrictDialog';
import DeleteAccountDialog from './DeleteAccountDialog';
import useAsync from '@osu-idle/shared/hooks/useAsync';
import {
	block,
	getRelation,
	unblock,
} from '../../api/social';
import ReportDialog from './ReportDialog';

/** osu!web's ⋮ menu on someone else's profile: block and report, and restrict for admins. */
export default function ProfileMenu({ userId, name, restricted }: {
	userId: number;
	name: string;
	restricted: boolean;
}) {
	const { t } = useLingui();
	const admin = isAdmin(useCurrentUser()?.id);
	const [restricting, setRestricting] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const reload = () => window.location.reload();
	const relation = useAsync(() => getRelation(userId), [userId]);
	const [blocked, setBlocked] = useState<boolean>();
	const [open, setOpen] = useState(false);
	const [reporting, setReporting] = useState(false);
	const isBlocked = blocked ?? (!!relation && 'blocked' in relation && relation.blocked);

	const toggleBlock = async () => {
		setOpen(false);
		if (isBlocked) await unblock(userId);
		else await block(userId);
		setBlocked(!isBlocked);
	};

	return (
		<div className='profile-menu'>
			<button
				type='button'
				className='profile-menu__toggle'
				aria-label={t`more`}
				onClick={() => setOpen(!open)}
			>
				<FontAwesomeIcon icon={faEllipsisVertical} />
			</button>
			{open && <div className='profile-menu__away' onClick={() => setOpen(false)} />}
			{open && <div className='profile-menu__items'>
				<button type='button' className='profile-menu__item' onClick={() => void toggleBlock()}>
					<FontAwesomeIcon icon={faBan} />
					{isBlocked ? t`Unblock` : t`Block`}
				</button>
				<button type='button' className='profile-menu__item' onClick={() => {
					setOpen(false);
					setReporting(true);
				}}>
					<FontAwesomeIcon icon={faTriangleExclamation} />
					{t`Report`}
				</button>
				{admin && (restricted
					? <button type='button' className='profile-menu__item' onClick={() => {
						setOpen(false);
						void liftRestriction(userId).then(reload);
					}}>
						<FontAwesomeIcon icon={faLockOpen} />
						{t`Lift restriction`}
					</button>
					: <button type='button' className='profile-menu__item' onClick={() => {
						setOpen(false);
						setRestricting(true);
					}}>
						<FontAwesomeIcon icon={faLock} />
						{t`Restrict`}
					</button>)}
				{admin && <button type='button' className='profile-menu__item' onClick={() => {
					setOpen(false);
					setDeleting(true);
				}}>
					<FontAwesomeIcon icon={faTrash} />
					{t`Delete account`}
				</button>}
			</div>}
			{deleting && <DeleteAccountDialog
				userId={userId}
				onDone={() => window.location.assign('/web/')}
				onClose={() => setDeleting(false)}
			/>}
			{restricting && <RestrictDialog
				userId={userId}
				name={name}
				onDone={reload}
				onClose={() => setRestricting(false)}
			/>}
			{reporting && <ReportDialog userId={userId} name={name} onClose={() => setReporting(false)} />}
		</div>
	);
}
