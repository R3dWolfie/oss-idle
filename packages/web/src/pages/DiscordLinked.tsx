import './DesktopDone.css';
import { Trans } from '@lingui/react/macro';

/** Where the Discord link round-trip lands, in whatever browser it ran in. */
export default function DiscordLinked() {
	return (
		<main className="page-contents desktop-done">
			<h1 className="center"><Trans>Your Discord account is linked!</Trans></h1>
			<p className="center">
				<Trans>Your level role will show up on the osu!idle Discord server. You can close this tab.</Trans>
			</p>
		</main>
	);
}
