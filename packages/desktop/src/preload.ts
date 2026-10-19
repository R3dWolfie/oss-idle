import {
	contextBridge,
	ipcRenderer,
	webFrame,
} from 'electron';
// shared is ESM and this preload compiles to CommonJS; the resolution-mode hint
// lets the type-only import resolve without making the whole package ESM (an
// ESM preload has extra Electron caveats we don't need on the auth path).
// eslint-disable-next-line object-curly-newline -- false positive from the import attribute
import type {
	DesktopPresence,
	DesktopUpdateStatus,
	OssIdleDesktop,
} from '@oss-idle/shared/desktop' with { 'resolution-mode': 'import' };

/**
 * Runs in every frame (top window + the same-origin /web iframe). Exposes the
 * typed {@link OssIdleDesktop} bridge the renderer feature-detects via
 * `@oss-idle/shared/desktop`. The session token is seeded synchronously so the
 * very first API call already carries it, then kept live via a push from main.
 */

const boot = ipcRenderer.sendSync('oss-idle:bootstrap') as { 
	token: string | null; 
	version: string;
	uncapped: boolean;
};

let token: string | null = boot.token;
const listeners = new Set<(token: string | null) => void>();

ipcRenderer.on('oss-idle:auth-token', (_event, next: string | null) => {
	token = next;
	for (const cb of listeners) {
		try { cb(token); } catch (e) { console.error('[desktop] auth listener threw', e); }
	}
});

const updateListeners = new Set<(status: DesktopUpdateStatus) => void>();
ipcRenderer.on('oss-idle:update-status', (_event, status: DesktopUpdateStatus) => {
	for (const cb of updateListeners) {
		try { cb(status); } catch (e) { console.error('[desktop] update listener threw', e); }
	}
});

const fullscreenListeners = new Set<(on: boolean) => void>();
ipcRenderer.on('oss-idle:fullscreen', (_event, on: boolean) => {
	for (const cb of fullscreenListeners) {
		try { cb(on); } catch (e) { console.error('[desktop] fullscreen listener threw', e); }
	}
});

const deepLinkListeners = new Set<(link: string) => void>();
ipcRenderer.on('oss-idle:deep-link', (_event, link: string) => {
	for (const cb of deepLinkListeners) {
		try { cb(link); } catch (e) { console.error('[desktop] deep link listener threw', e); }
	}
});

const bridge: OssIdleDesktop = {
	isDesktop: true,
	version: boot.version,
	getToken: () => token,
	login: () => ipcRenderer.invoke('oss-idle:login'),
	logout: () => ipcRenderer.invoke('oss-idle:logout'),
	onAuthChanged: cb => {
		listeners.add(cb);
		return () => { listeners.delete(cb); };
	},
	setFullscreen: on => ipcRenderer.send('oss-idle:set-fullscreen', on),
	setZoomFactor: factor => webFrame.setZoomFactor(factor),
	setPresence: (presence: DesktopPresence | null) => ipcRenderer.send('oss-idle:presence', presence),
	quit: () => ipcRenderer.send('oss-idle:quit'),
	onDeepLink: cb => {
		deepLinkListeners.add(cb);
		return () => { deepLinkListeners.delete(cb); };
	},
	onFullscreenChanged: cb => {
		fullscreenListeners.add(cb);
		return () => { fullscreenListeners.delete(cb); };
	},
	update: {
		check: () => ipcRenderer.invoke('oss-idle:update-check'),
		download: () => ipcRenderer.invoke('oss-idle:update-download'),
		install: () => ipcRenderer.send('oss-idle:update-install'),
		onStatus: cb => {
			updateListeners.add(cb);
			return () => { updateListeners.delete(cb); };
		},
	},
	frameRate: {
		uncapped: boot.uncapped,
		setUncapped: on => ipcRenderer.send('oss-idle:set-uncapped', on),
	},
	steam: { available: false },
};

contextBridge.exposeInMainWorld('ossIdleDesktop', bridge);
