import {
	app,
	safeStorage,
	shell,
} from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import {
	API_BASE,
	IS_DEV,
	SITE_BASE,
} from './config';
import { broadcast } from './frames';

/**
 * Desktop session handling. The osu! OAuth round-trip runs in the user's real
 * system browser (trusted chrome, password managers, no embedded-webview
 * friction). The app waits on its own loopback (RFC 8252): the server's callback
 * sends that browser to `127.0.0.1:<port>` with a one-time code, which only the
 * machine that signed in can receive, and the app swaps it for the session. The
 * token is then held here (encrypted on disk via {@link safeStorage}) and pushed
 * to every renderer frame, which sends it as a `Bearer` header on each API call.
 */

const LOGIN_TIMEOUT_MS = 5 * 60_000;
const SIGNED_IN_PAGE = `${IS_DEV ? 'http://localhost:5173' : SITE_BASE}/web/auth/desktop`;

let token: string | null = null;
// The in-flight login's listener: a newer login closes it.
let activeLogin: http.Server | null = null;

const tokenFile = () => path.join(app.getPath('userData'), 'session.bin');

/** Load any persisted session at startup. */
export function loadToken(): void {
	try {
		const buf = fs.readFileSync(tokenFile());
		token = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buf) : buf.toString('utf8');
	} catch {
		token = null;
	}
}

function persist(): void {
	try {
		if (token === null) {
			fs.rmSync(tokenFile(), { force: true });
			return;
		}
		const buf = safeStorage.isEncryptionAvailable()
			? safeStorage.encryptString(token)
			: Buffer.from(token, 'utf8');
		fs.writeFileSync(tokenFile(), buf);
	} catch (e) {
		console.error('[auth] failed to persist session', e);
	}
}

export function getToken(): string | null {
	return token;
}

function setToken(next: string | null): void {
	token = next;
	persist();
	// push to every frame (top + the /web iframe) so each bridge - and its API
	// client - switches identity.
	broadcast('osu-idle:auth-token', token);
}

/** Swap the one-time code for the session token. */
async function redeem(code: string): Promise<string> {
	const res = await fetch(`${API_BASE}/v1/auth/osu/desktop/exchange`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ code }),
	});
	if (!res.ok) throw new Error(`sign-in failed (${res.status})`);
	return (await res.json() as { token: string }).token;
}

/** The code the browser brings back to the loopback, once it carries this login's key. */
const awaitCode = (server: http.Server, key: string): Promise<string> =>
	new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error('login timed out')), LOGIN_TIMEOUT_MS);
		server.on('close', () => {
			clearTimeout(timer);
			reject(new Error('login superseded'));
		});
		server.on('request', (req, res) => {
			const url = new URL(req.url ?? '/', 'http://127.0.0.1');
			const code = url.searchParams.get('code');
			if (url.pathname !== '/callback' || !code || url.searchParams.get('key') !== key) {
				res.writeHead(404).end();
				return;
			}
			res.writeHead(302, {
				Location: SIGNED_IN_PAGE, Connection: 'close',
			}).end();
			clearTimeout(timer);
			resolve(code);
		});
	});

/** Begin sign-in: listen on a loopback port, open the system browser to the OAuth
 *  flow with it, and redeem the code the browser brings back. */
export async function startLogin(): Promise<void> {
	activeLogin?.close();
	const server = http.createServer();
	activeLogin = server;
	try {
		await new Promise<void>((resolve, reject) => {
			server.once('error', reject);
			server.listen(0, '127.0.0.1', resolve);
		});
		const { port } = server.address() as AddressInfo;
		const key = randomUUID();
		void shell.openExternal(`${API_BASE}/v1/auth/osu/login?client=desktop&port=${port}&key=${key}`);
		const code = await awaitCode(server, key);
		setToken(await redeem(code));
	} finally {
		server.close();
		if (activeLogin === server) activeLogin = null;
	}
}

export function logout(): void {
	activeLogin?.close();
	activeLogin = null;
	setToken(null);
}
