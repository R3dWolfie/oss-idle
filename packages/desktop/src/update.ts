import {
	app,
	autoUpdater as nativeUpdater,
} from 'electron';
// electron-updater is CommonJS and exposes `autoUpdater` as a *named* export (no
// default), so import it by name - a default import resolves to `undefined`.
import { autoUpdater } from 'electron-updater';
// eslint-disable-next-line @stylistic/max-len
import type { DesktopUpdateStatus } from '@oss-idle/shared/desktop' with { 'resolution-mode': 'import' };
import { broadcast } from './frames';
import {
	DESKTOP_SCHEME,
	STAGING,
} from './config';

/**
 * In-app self-update. The feed (provider/url) is read from the `app-update.yml`
 * electron-builder bundles from the `publish` config, so packaged builds know
 * where to look with no extra wiring. User-initiated: the renderer checks when it
 * learns a newer build shipped (the client already polls the server version),
 * then chooses to download and restart.
 */

let status: DesktopUpdateStatus = { state: 'idle' };

function emit(next: DesktopUpdateStatus): void {
	status = next;
	broadcast('oss-idle:update-status', status);
}

export function getUpdateStatus(): DesktopUpdateStatus {
	return status;
}

/** Wire the updater's events to status broadcasts. Call once, after ready. */
export function initUpdater(): void {
	autoUpdater.autoDownload = false;          // wait for the user to choose
	autoUpdater.autoInstallOnAppQuit = true;   // apply a fetched update on next quit
	// shipped versions carry a `-buildNNNN` prerelease tag, so build→build updates
	// are prerelease→prerelease - electron-updater needs this to offer them.
	autoUpdater.allowPrerelease = true;
	// surface the updater's own diagnostics (feed URL, versions compared, errors)
	// to the main-process console - run the app from a terminal to see them.
	autoUpdater.logger = {
		info: (m: unknown) => console.log('[updater]', m),
		warn: (m: unknown) => console.warn('[updater]', m),
		error: (m: unknown) => console.error('[updater]', m),
		debug: (m: unknown) => console.debug('[updater]', m),
	};

	autoUpdater.on('checking-for-update', () => emit({ state: 'checking' }));
	autoUpdater.on('update-available', info => emit({
		state: 'available', version: info.version, 
	}));
	autoUpdater.on('update-not-available', () => emit({ state: 'none' }));
	autoUpdater.on('download-progress', p => emit({
		state: 'downloading', percent: Math.round(p.percent), 
	}));
	autoUpdater.on('error', err => emit({
		state: 'error', message: err?.message ?? String(err), 
	}));
}

/** The updater only works in a packaged build - it reads app-update.yml and
 *  swaps the installed app. In dev there's nothing to update. */
function unavailable(): boolean {
	return !app.isPackaged;
}

export async function checkForUpdate(): Promise<DesktopUpdateStatus> {
	if (unavailable()) return { state: 'none' };
	try {
		await autoUpdater.checkForUpdates();
	} catch (e) {
		emit({
			state: 'error', message: e instanceof Error ? e.message : String(e), 
		});
	}
	return status;
}

export async function downloadUpdate(): Promise<void> {
	if (unavailable()) return;
	try {
		await autoUpdater.downloadUpdate();
	} catch (e) {
		emit({
			state: 'error', message: e instanceof Error ? e.message : String(e), 
		});
	}
}

export function installUpdate(): void {
	if (unavailable()) return;
	const appImage = process.env.APPIMAGE;
	if (process.platform === 'linux' && appImage) {
		// electron-updater restarts an AppImage with no arguments at all, so the flags it was
		// started with (--no-sandbox, Wayland switches, a debugging port) were gone after every
		// update. Install without its restart and relaunch with this run's own arguments; it
		// renames the file when the name carries a version, so follow that.
		let target = appImage;
		autoUpdater.once('appimage-filename-updated', (path: string) => {
			target = path;
		});
		// sent only after a successful install
		nativeUpdater.once('before-quit-for-update', () => app.relaunch({
			execPath: target,
			args: process.argv.slice(1).filter(arg => !arg.startsWith(`${DESKTOP_SCHEME}://`)),
		}));
		autoUpdater.quitAndInstall(true, false);
		return;
	}
	autoUpdater.quitAndInstall();
}

/** Staging: the LAN server's release streams, name → the origin serving its feed. */
async function fetchStreams(): Promise<Record<string, string>> {
	if (!STAGING?.streams) return {};
	try {
		const res = await fetch(STAGING.streams, {
			cache: 'no-store', signal: AbortSignal.timeout(3000),
		});
		return res.ok ? await res.json() as Record<string, string> : {};
	} catch {
		return {};
	}
}

export async function listStreams(): Promise<{ current: string; streams: string[] }> {
	return {
		current: STAGING?.stream ?? 'staging', streams: Object.keys(await fetchStreams()),
	};
}

/** Install another stream's latest build: its feed, older or not, then a restart. */
export async function switchStream(name: string): Promise<void> {
	const origin = (await fetchStreams())[name];
	if (unavailable() || !origin) return;
	autoUpdater.setFeedURL({
		provider: 'generic', url: `${origin}/download/${name}/`,
	});
	autoUpdater.allowDowngrade = true;
	await checkForUpdate();
	if (status.state !== 'available') return;
	await downloadUpdate();
	if (getUpdateStatus().state !== 'error') installUpdate();
}
