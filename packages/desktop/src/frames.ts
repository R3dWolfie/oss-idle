import {
	BrowserWindow,
	type WebFrameMain,
} from 'electron';
import { RENDERER_URL } from './config';

// by hand: Node's URL gives app:// the opaque origin 'null', which data: frames share
const APP = RENDERER_URL.replace(/\/$/, '');

/** The game's own documents: anything else framed in the window (a YouTube embed,
 *  a site a link took the /web frame to) gets neither the bridge nor the session.
 *  The top document always does: it holds the updater that would ship a fix. */
export const isAppFrame = (frame: WebFrameMain | null | undefined): frame is WebFrameMain =>
	!!frame && (!frame.parent || frame.origin === APP || frame.url.startsWith(RENDERER_URL));

function* subtree(frame: WebFrameMain | null): Generator<WebFrameMain> {
	if (!frame) return;
	yield frame;
	for (const child of frame.frames) yield* subtree(child);
}

/** Send an IPC message to every frame of every window - the top document and the
 *  same-origin /web iframe, so each one's bridge (and its API client) sees it. */
export function broadcast(channel: string, payload: unknown): void {
	for (const win of BrowserWindow.getAllWindows()) {
		for (const frame of subtree(win.webContents.mainFrame)) {
			if (!isAppFrame(frame)) continue;
			try { frame.send(channel, payload); } catch { /* frame gone */ }
		}
	}
}
