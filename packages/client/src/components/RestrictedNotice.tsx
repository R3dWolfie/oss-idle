import './RestrictedNotice.css';
import { Trans } from '@lingui/react/macro';
import { ph } from '@lingui/core/macro';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import { CONTACT_EMAIL } from '@oss-idle/shared/contact';
import Auth from '../online/auth';
import { showUsers } from './community/state';
import SceneManager, { SCENE } from '../scenes/SceneManager';
import {
	isCommunityOpen,
	openPage,
} from '../globals';

const HIDDEN_IN: string[] = [SCENE.INTRO, SCENE.GAME, SCENE.RESULT, SCENE.SELECT];

/** The alpha's warning strip, kept for a restricted account. */
export default function RestrictedNotice() {
	const [user] = useSynced(Auth.user);
	const [scene] = useSynced(SceneManager.current);
	const [users] = useSynced(showUsers);
	const [community] = useSynced(isCommunityOpen);
	const [page] = useSynced(openPage);

	if (!user?.restricted || HIDDEN_IN.includes(scene) || page || (users && community)) return null;

	return (
		<div className='restricted__warning'>
			<div className='restricted__border'></div>
			<div className='restricted__text'>
				<Trans>
					Your account has been <b>restricted</b>: you can't play or chat. If you think
					it's a mistake: <a href={`mailto:${CONTACT_EMAIL}`}>{ph({ email: CONTACT_EMAIL })}</a>
				</Trans>
			</div>
		</div>
	);
}
