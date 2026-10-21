import { hc } from 'hono/client';
import type { ClientResponse } from 'hono/client';
import type { AppType } from '@oss-idle/server';
import { desktop } from '@oss-idle/shared/desktop';
import {
	edgeList,
	failoverFetch,
	onApiBaseChange,
	pickApiBase,
} from '@oss-idle/shared/apiBase';

/** API origin (or the edge measured nearest on an earlier load); empty in dev so
 *  requests go through the Vite proxy. Follows the page onto another origin when
 *  this one fails (a live binding). */
export let API_URL = pickApiBase(
	import.meta.env.VITE_API_URL ?? '',
	edgeList(import.meta.env.VITE_API_EDGES),
);
onApiBaseChange(base => {
	API_URL = base;
});

/** Resolve an API path (e.g. /v1/news) or stored media path to a full URL. */
export const apiUrl = (path: string): string =>
	/^https?:\/\//.test(path) ? path : `${API_URL}${path}`;

/**
 * Apply the live session auth to an outgoing API request:
 *  - browser: the session is an HttpOnly cookie, sent via `credentials: 'include'`.
 *  - desktop: the app loads from an `app://` origin the API cookie can't ride, so
 *    its main process adds the token as a `Bearer` header (no cookie).
 */
export function withAuth(init?: RequestInit): RequestInit {
	return {
		...init, credentials: desktop() ? 'omit' : 'include',
	};
}

/** Parse a JSON response, throwing the server's error message on failure. */
export async function json<T>(res: Response): Promise<T> {
	if (!res.ok) {
		const body = await res.json().catch(() => ({})) as { error?: string };
		throw new Error(body.error ?? `Request failed (${res.status})`);
	}
	return res.json() as Promise<T>;
}

/** Send a credentialed request to an API path; JSON-encodes a body when given. */
export const send = (method: string, path: string, body?: unknown): Promise<Response> =>
	fetch(apiUrl(path), withAuth({
		method,
		headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	}));

/** Send a request and parse the JSON response in one step. */
export const request = <T>(method: string, path: string, body?: unknown): Promise<T> =>
	send(method, path, body).then(json<T>);

/**
 * Typed RPC client generated from the server's `AppType` - every route, its
 * params, and its return type are inferred from the server, so there are no
 * hand-written client types to keep in sync. Mirrors the game client's
 * `online/client.ts`; `AppType` is a type-only import, so no server runtime is
 * bundled.
 */
const apiFetch = failoverFetch((input, init) => fetch(input, withAuth(init)));
export const rpc = hc<AppType>(API_URL, { fetch: apiFetch });

/** Await a typed RPC response, throwing the server's error message on failure. */
export async function unwrap<T>(p: Promise<ClientResponse<T>>): Promise<T> {
	return p.then(json<T>);
}
