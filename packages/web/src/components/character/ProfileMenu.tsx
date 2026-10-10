import './ProfileMenu.css';
import { useState } from 'react';
import { useLingui } from '@lingui/react/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	faBan,
	faEllipsisVertical,
	faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import useAsync from '@osu-idle/shared/hooks/useAsync';
import {
	block,
	getRelation,
	unblock,
} from '../../api/social';
import ReportDialog from './ReportDialog';

/** osu!web's ⋮ menu on someone else's profile: block and report. */
export default function ProfileMenu({ userId, name }: { userId: number; name: string }) {
	const { t } = useLingui();
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
			</div>}
			{reporting && <ReportDialog userId={userId} name={name} onClose={() => setReporting(false)} />}
		</div>
	);
}
