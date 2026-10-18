import './SupporterHeart.css';
import { Trans } from '@lingui/react/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart } from '@fortawesome/free-solid-svg-icons/faHeart';
import useSynced from '@osu-idle/shared/hooks/useSynced';
import Auth from '../online/auth';

/** osu!'s main menu heart, for supporters. */
export default function SupporterHeart() {
	const [user] = useSynced(Auth.user);
	if (!user?.supporter) return null;
	return <div className='supporter-heart'>
		<FontAwesomeIcon icon={faHeart} />
		<div className='supporter-heart__tip'>
			<Trans>You are a supporter.</Trans><br />
			<Trans>Thanks for your generosity!</Trans>
		</div>
	</div>;
}
