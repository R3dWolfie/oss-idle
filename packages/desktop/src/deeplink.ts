import { DESKTOP_SCHEME } from './config';

/**
 * Custom-scheme (`oss-idle://<action>?<params>`) deep-link entry point. The OS
 * routes these to the running app, which is registered as the protocol client and
 * single-instanced so a link always reaches the live window (see main.ts), which
 * also brings the window forward for every link.
 *
 * `focus` is the post-sign-in "Return to oss!idle" button, whose whole job is
 * that refocus (so there's nothing to do here). `dl` is a beatmap page's
 * download, which the renderer carries out.
 */
export function handleDeepLink(rawUrl: string, toRenderer: (link: string) => void): void {
	let url: URL;
	try {
		url = new URL(rawUrl);
	} catch {
		return;
	}
	if (url.protocol !== `${DESKTOP_SCHEME}:`) return;

	switch (url.host) {
		case 'focus':
			return; // window focus is handled by the caller (main.ts)
		case 'dl':
			return toRenderer(rawUrl);
		default:
			console.warn(`[deeplink] no handler for action "${url.host}"`, rawUrl);
	}
}
