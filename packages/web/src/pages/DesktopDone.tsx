import { useEffect } from 'react';
import './DesktopDone.css';
import { Trans } from '@lingui/react/macro';

/** The app's deep-link scheme. Builds from before the rename to oss!idle send no
 *  `scheme` and answer to the old one only. */
const scheme = (): string =>
	new URLSearchParams(location.search).get('scheme') === 'oss-idle' ? 'oss-idle' : 'osu-idle';

/**
 * Shown in the system browser after the desktop OAuth round-trip: the app's
 * loopback sends it here once it has the code. The "Return" button is an
 * `oss-idle://` deep link whose click (a user gesture) the OS honours to bring
 * the app forward (an automatic redirect to a custom scheme is blocked by some
 * browsers).
 */
export default function DesktopDone() {

	useEffect(() => {
		window.location.href = `${scheme()}://focus`;

		setTimeout(() => window.close(), 30000);
	}, []);

	return (
		<main className="page-contents desktop-done">
			<h1 className="center"><Trans>You're signed in!</Trans></h1>
			<p className="center"><Trans>Back in oss!idle already? You can close this tab.</Trans></p>
			<a className="cta-button" href={`${scheme()}://focus`}><Trans>Return to oss!idle</Trans></a>
		</main>
	);
}
