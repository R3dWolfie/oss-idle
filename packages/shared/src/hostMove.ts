import {
	LEGACY_SAVE_DB,
	SAVE_DB,
	readSave,
} from './save.js';

/** The host oss!idle left. Old links and old desktop builds still reach it. */
export const OLD_HOST = 'osu.idle.rhythmgamers.net';
const OLD_ORIGIN = `https://${OLD_HOST}`;
const NEW_ORIGIN = 'https://oss.idle.rhythmgamers.net';
const OLD_API = 'https://api.osu.idle.rhythmgamers.net';
const TIMEOUT_MS = 15_000;
/** Set by move.html when the old host handed data over, until the player chose
 *  to keep or delete what is left there. */
const LEFT_DATA_KEY = 'oss-idle:old-host-data';

/** What the old host hands over. client/public/move.html takes it on the new one. */
export interface HostMove {
	save?: Uint8Array;
	storage: Record<string, string>;
	/** One-time code for the session, redeemed at /v1/auth/move/redeem. */
	code?: string;
}

const sessionCode = async (): Promise<string | undefined> => {
	const res = await fetch(`${OLD_API}/v1/auth/move`, {
		method: 'POST', credentials: 'include',
	});
	return res.ok ? (await res.json() as { code: string }).code : undefined;
};

/** Send `message` to move.html in a hidden frame of `origin` once it is ready, and
 *  settle on its `reply`. Both hosts are one site (rhythmgamers.net), so the
 *  frame's storage is that host's own. */
const talk = (origin: string, message: unknown, reply: string): Promise<void> =>
	new Promise(resolve => {
		const frame = document.createElement('iframe');
		const done = () => {
			removeEventListener('message', onMessage);
			frame.remove();
			resolve();
		};
		const onMessage = (e: MessageEvent) => {
			if (e.origin !== origin || e.source !== frame.contentWindow) return;
			if (e.data === 'ready') frame.contentWindow?.postMessage(message, origin);
			if (e.data === reply) done();
		};
		addEventListener('message', onMessage);
		setTimeout(done, TIMEOUT_MS);
		frame.hidden = true;
		frame.src = `${origin}/move.html`;
		document.body.append(frame);
	});

/** On the old host's top window: hand the save, settings and session to the new
 *  host, then go there. Never settles there; resolves at once anywhere else. */
export async function moveHost(): Promise<void> {
	if (location.hostname !== OLD_HOST || window.top !== window) return;
	try {
		await talk(NEW_ORIGIN, {
			save: await readSave(SAVE_DB) ?? await readSave(LEGACY_SAVE_DB),
			storage: { ...localStorage },
			code: await sessionCode().catch(() => undefined),
		} satisfies HostMove, 'moved');
	} catch (e) {
		console.error('[move]', e);
	}
	location.replace(NEW_ORIGIN + location.pathname + location.search + location.hash);
	await new Promise(() => {});
}

/** Whether the old host still holds data the player has not decided about. */
export const hasOldHostData = (): boolean => localStorage.getItem(LEFT_DATA_KEY) !== null;

/** Keep what is left on the old host, and stop asking. */
export const forgetOldHost = (): void => localStorage.removeItem(LEFT_DATA_KEY);

/** Delete everything the old host keeps in this browser (save, settings,
 *  downloaded beatmaps, session), and stop asking. */
export async function clearOldHost(): Promise<void> {
	await talk(OLD_ORIGIN, 'clear', 'cleared');
	forgetOldHost();
}
