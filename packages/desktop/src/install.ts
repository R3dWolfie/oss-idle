import {
	app,
	type BrowserWindow,
	dialog,
} from 'electron';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
// eslint-disable-next-line @stylistic/max-len
import type { DesktopMoveResult } from '@oss-idle/shared/desktop' with { 'resolution-mode': 'import' };

const installDir = path.dirname(process.execPath);

/** Every NSIS install keeps a copy of its installer in the updater cache; re-running it
 *  with /D= installs there and uninstalls the old folder. AppImage/dmg are already portable. */
function storedInstaller(): string | undefined {
	if (process.platform !== 'win32' || !app.isPackaged || !process.env.LOCALAPPDATA) return undefined;
	try {
		const config = fs.readFileSync(path.join(process.resourcesPath, 'app-update.yml'), 'utf8');
		const cacheDir = /^updaterCacheDirName:\s*['"]?(.+?)['"]?\s*$/m.exec(config)?.[1];
		if (!cacheDir) return undefined;
		const installer = path.join(process.env.LOCALAPPDATA, cacheDir, 'installer.exe');
		return fs.existsSync(installer) ? installer : undefined;
	} catch {
		return undefined;
	}
}

export const canMoveInstall = !!storedInstaller();

export async function moveInstall(
	win: BrowserWindow | undefined,
	title: string,
): Promise<DesktopMoveResult> {
	const installer = storedInstaller();
	if (!installer) return 'unavailable';
	const options: Electron.OpenDialogOptions = {
		title,
		properties: ['openDirectory', 'createDirectory'],
	};
	const picked = await (win ? dialog.showOpenDialog(win, options) : dialog.showOpenDialog(options));
	const parent = picked.filePaths[0];
	if (picked.canceled || !parent) return 'cancelled';

	const target = path.join(parent, path.basename(installDir));
	const fromInstall = path.relative(installDir, target);
	// the old folder is wiped once the new install lands
	const outside = fromInstall === '..' || fromInstall.startsWith(`..${path.sep}`)
		|| path.isAbsolute(fromInstall);
	if (!outside) return 'inside';
	try {
		fs.mkdirSync(target, { recursive: true });
		// a later uninstall wipes the whole folder, so it must hold only the game
		if (fs.readdirSync(target).length > 0) return 'not-empty';
		// the old install is removed before the new one is written: never start on a folder that can't take it
		const probe = path.join(target, '.write-test');
		fs.writeFileSync(probe, '');
		fs.rmSync(probe);
	} catch {
		return 'not-writable';
	}

	spawn(installer, ['--updated', '/S', '--force-run', `/D=${target}`], {
		detached: true,
		stdio: 'ignore',
	}).unref();
	app.quit();
	return 'moving';
}
