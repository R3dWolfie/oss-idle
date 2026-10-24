import { execFileSync } from 'node:child_process';
import {
	mkdir,
	mkdtemp,
	realpath,
	rm,
	symlink,
	writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
	afterAll,
	beforeAll,
	describe,
	expect,
	it,
} from 'vitest';
import { readInside } from '../../server/src/addonBuild';

// what a build container can leave in the work dir, for the host to read back
describe('readInside', () => {
	let root: string;
	let secret: string;

	beforeAll(async () => {
		const base = await realpath(await mkdtemp(path.join(tmpdir(), 'addon-build-test-')));
		root = path.join(base, 'repo');
		secret = path.join(base, 'host-secret');
		await mkdir(path.join(root, 'dist'), { recursive: true });
		await writeFile(secret, 'JWT_SECRET=hunter2');
		await writeFile(path.join(root, 'dist', 'addon.js'), 'export const mount = () => {};');
		await writeFile(path.join(root, 'big.js'), 'x'.repeat(100));
		await symlink(secret, path.join(root, 'dist', 'link.js'));
		await symlink(path.dirname(secret), path.join(root, 'out'));
		execFileSync('mkfifo', [path.join(root, 'fifo.js')]);
	});
	afterAll(() => rm(path.dirname(root), {
		recursive: true, force: true,
	}));

	it('reads a plain file inside', async () => {
		expect((await readInside(root, 'dist/addon.js', 1000)).text).toBe('export const mount = () => {};');
	});

	it('refuses a symlink to a host file', async () => {
		await expect(readInside(root, 'dist/link.js', 1000)).rejects.toThrow('plain file');
	});

	it('refuses a path through a symlinked folder', async () => {
		await expect(readInside(root, 'out/host-secret', 1000)).rejects.toThrow('plain file');
	});

	it('refuses a path leaving the repository', async () => {
		await expect(readInside(root, '../host-secret', 1000)).rejects.toThrow('plain file');
		await expect(readInside(root, secret, 1000)).rejects.toThrow('plain file');
	});

	it('refuses a FIFO, which would block the read', async () => {
		await expect(readInside(root, 'fifo.js', 1000)).rejects.toThrow('plain file');
	});

	it('refuses a file over the cap', async () => {
		await expect(readInside(root, 'big.js', 10)).rejects.toThrow('over');
	});
});
