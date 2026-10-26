import { faHeart } from '@fortawesome/free-solid-svg-icons/faHeart';
import { faUserGroup } from '@fortawesome/free-solid-svg-icons/faUserGroup';
import { faUserPlus } from '@fortawesome/free-solid-svg-icons/faUserPlus';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';

import Log from '@oss-idle/shared/helpers/log';
import useSynced from '@oss-idle/shared/hooks/useSynced';

import Auth from '../../../online/auth';
import {
	addFriend,
	friends,
	mutuals,
} from '../../../online/friends';

/** osu!'s user panel buttons: add as a friend, whether they are one and whether they added you back. */
export default function NameCardFriends({ userId }: { userId: number }) {
	const { t } = useLingui();
	const [user] = useSynced(Auth.user);
	const [friendIds = new Set<number>()] = useSynced(friends);
	const [mutualIds = new Set<number>()] = useSynced(mutuals);
	const [adding, setAdding] = useState(false);
	if (!user || user.id === userId) return null;
	const friend = friendIds.has(userId), mutual = mutualIds.has(userId);
	const add = async () => {
		setAdding(true);
		try {
			await addFriend(userId);
		} catch (e) {
			Log.errorPopup(String(e));
		} finally {
			setAdding(false);
		}
	};
	return (
		<div className="name-card__buttons">
			{mutual && (
				<span className="name-card__button name-card__button--on" title={t`Mutual friends`}>
					<FontAwesomeIcon icon={faUserGroup} />
				</span>
			)}
			{friend ? (
				<span className="name-card__button name-card__button--on" title={t`Friend`}>
					<FontAwesomeIcon icon={faHeart} />
				</span>
			) : (
				<button
					type="button"
					className="name-card__button"
					title={t`Add friend`}
					disabled={adding}
					onClick={() => void add()}
				>
					<FontAwesomeIcon icon={faUserPlus} />
				</button>
			)}
		</div>
	);
}
