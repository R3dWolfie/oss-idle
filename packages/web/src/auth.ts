import { desktop } from '@oss-idle/shared/desktop';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const OAUTH_LOGIN = `${API_URL}/v1/auth/osu/login`;

/** True when the web platform runs inside the game's in-game browser (a
 *  same-origin iframe), false when opened top-level in a normal browser. */
export function inGameBrowser(): boolean {
	try {
		return window.self !== window.top;
	} catch {
		// Cross-origin framing throws on access → treat as embedded.
		return true;
	}
}

/** Start the osu! sign-in, branching on where the page is running:
 *  - desktop app: hand off to the native flow (system browser → deep link). The
 *    app can't ride a browser cookie, so OAuth runs outside the renderer and the
 *    resulting token is delivered back to every frame via the bridge.
 *  - in-game browser: popup → API sets the session cookie → AuthCallback pings
 *    the game over same-origin localStorage and closes (the existing flow).
 *  - top-level: redirect this tab through OAuth and land back in the game
 *    (origin root) already signed in. */
export function loginWithOsu(): void {
	const app = desktop();
	if (app) {
		void app.login().catch(err => console.warn('[auth] desktop login failed', err));
	} else if (inGameBrowser()) {
		window.open(OAUTH_LOGIN, 'osu-login', 'width=520,height=720,menubar=no,toolbar=no,location=no');
	} else {
		window.location.href = OAUTH_LOGIN;
	}
}
const RETURN_KEY = 'oss-idle:after-login';

/** Sign in, then come back to this page (the top-level flow lands on /auth/callback first). */
export function loginAndReturn(): void {
	try {
		sessionStorage.setItem(RETURN_KEY, window.location.pathname + window.location.search);
	} catch { /* storage blocked: the player lands on the callback page */ }
	loginWithOsu();
}

/** Where {@link loginAndReturn} asked to come back to, once. */
export function takeReturnPath(): string | undefined {
	try {
		const path = sessionStorage.getItem(RETURN_KEY);
		sessionStorage.removeItem(RETURN_KEY);
		return path?.startsWith('/web/') ? path : undefined;
	} catch {
		return undefined;
	}
}
