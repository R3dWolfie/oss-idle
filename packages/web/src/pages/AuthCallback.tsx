import { ph } from '@lingui/core/macro';
import './AuthCallback.css';

import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { pageTitle } from '../globals';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import PlayOssIdle from './PlayOssIdle';
import { takeReturnPath } from '../auth';

/** osu! → API → here. The API already set the session cookie; this page just
 * notifies the game (same-origin localStorage ping) and closes the popup. */
export default function AuthCallback() {
	const navigate = useNavigate();
	useEffect(() => {
		try {
			localStorage.setItem('oss-idle:auth', String(Date.now()));
		} catch {
			void navigate({ to: '/auth/error' });
			return;
		}

		// In-game flow opens this as a popup → close it. The top-level landing
		// flow runs in the tab itself → drop the player into the game (origin
		// root), now signed in.
		if (window.opener && window.opener !== window) {
			window.close();
			return;
		}
		const back = takeReturnPath();
		if (back) window.location.replace(back);
        
	}, []);

	const { t } = useLingui();
	const user = useCurrentUser();

	useEffect(() => {
		pageTitle.set(user ? t`login` : t`one moment...`);
		return () => void pageTitle.set('');
	}, [user, t]);

	return (
		<main className="page-contents">
			<div className="page-text">
				{user && (<>
					<h1 className='center'><Trans>Hello {ph({ username: user.username })}!</Trans></h1>
                    
					<PlayOssIdle />
				</>)}
			</div>
		</main>
	);
}