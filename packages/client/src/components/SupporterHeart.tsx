import './SupporterHeart.css';
import { Trans } from '@lingui/react/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart } from '@fortawesome/free-solid-svg-icons/faHeart';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import Auth from '../online/auth';
import { SITE_URL } from '../globals';

/** osu!'s main menu heart: full for supporters, empty (a link to the store) for anyone else. */
export default function SupporterHeart() {
	const [user] = useSynced(Auth.user);
	if (user?.supporter) return <div className='supporter-heart'>
		<FontAwesomeIcon icon={faHeart} />
		<div className='supporter-heart__tip'>
			<Trans>You are a supporter.</Trans><br />
			<Trans>Thanks for your generosity!</Trans>
		</div>
	</div>;
	return <a
		className='supporter-heart supporter-heart--off'
		href={`${SITE_URL}/web/store`}
		target='_blank'
		rel='noreferrer'
	>
		<FontAwesomeIcon icon={faHeart} />
		<div className='supporter-heart__tip'>
			<Trans>Support the game to access cool features!</Trans>
		</div>
	</a>;
}
