import {
	sign,
	verify,
} from 'hono/jwt';
import { env } from '../env';

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days, seconds
const STATE_TTL = 60 * 5; // 5 minutes, seconds

export interface SessionPayload {
	uid: number;
	username: string;
}

const now = () => Math.floor(Date.now() / 1000);

/** Sign our session JWT (stored in the HttpOnly cookie). */
export function signSession(user: { id: number; username: string }): Promise<string> {
	return sign({
		uid: user.id, username: user.username, iat: now(), exp: now() + SESSION_TTL, 
	}, env.JWT_SECRET);
}

/** Verify the session JWT; throws if invalid or expired. */
export async function verifySession(token: string): Promise<SessionPayload> {
	const payload = await verify(token, env.JWT_SECRET, 'HS256');
	return {
		uid: payload.uid as number, username: payload.username as string, 
	};
}

/** Where the OAuth round-trip was started from, so the callback knows whether to
 *  set a browser cookie (web) or hand a token back to the desktop app. */
export type OAuthClient = 'web' | 'desktop';

/** Short-lived signed CSRF state for the OAuth round-trip, tagged with the client
 *  that started it. Desktop also carries its one-time `poll` code so the callback
 *  can stash the session under it for the app to poll for. */
export function signState(client: OAuthClient, poll?: string): Promise<string> {
	return sign({
		nonce: crypto.randomUUID(), client, poll, iat: now(), exp: now() + STATE_TTL, 
	}, env.JWT_SECRET);
}

/** Verify the CSRF state and recover the client tag, nonce, and desktop poll
 *  code; throws if invalid/expired. */
export async function verifyState(
	state: string,
): Promise<{ client: OAuthClient; nonce: string; poll?: string }> {
	const payload = await verify(state, env.JWT_SECRET, 'HS256');
	return {
		client: payload.client === 'desktop' ? 'desktop' : 'web',
		nonce: payload.nonce as string,
		poll: typeof payload.poll === 'string' ? payload.poll : undefined,
	};
}

/** State for linking a Discord account: names the signed-in account, since the
 *  Discord round-trip may run in a browser that holds no session (desktop). */
export const signLinkState = (uid: number): Promise<string> => sign({
	nonce: crypto.randomUUID(), uid, link: 'discord', iat: now(), exp: now() + STATE_TTL,
}, env.JWT_SECRET);

export const verifyLinkState = async (state: string): Promise<{ uid: number; nonce: string }> => {
	const payload = await verify(state, env.JWT_SECRET, 'HS256');
	if (payload.link !== 'discord') throw new Error('Not a link state');
	return {
		uid: payload.uid as number, nonce: payload.nonce as string,
	};
};
