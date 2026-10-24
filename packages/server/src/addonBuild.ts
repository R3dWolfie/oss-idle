/**
 * One repo add-on build, in throwaway Docker containers (see addonBuilder.ts). The
 * author's code only ever runs in the last, offline container, and nothing a
 * container leaves behind is trusted: symlinks, special files, sizes.
 */
import { spawn } from 'node:child_process';
import { lookup } from 'node:dns/promises';
import {
	lstat,
	mkdir,
	mkdtemp,
	open,
	realpath,
	rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
	MAX_ADDON_BUNDLE,
	type AddonBuildResult,
} from '@oss-idle/shared/addon';
import {
	isolationTargets,
	PROBE_SCRIPT,
} from './addonBuilderNetwork';
import { newestTag } from './addonTags';
import { isInternal } from './internalAddress';

const NETWORK = process.env.ADDON_BUILDER_NETWORK ?? 'oss-idle-addons';
const IMAGE = process.env.ADDON_BUILDER_IMAGE ?? 'node:26';
const WORK = process.env.ADDON_BUILDER_WORK ?? tmpdir();
const STEP_TIMEOUT_MS = 10 * 60_000;
const LOG_LINES = 200;
const LOG_LINE_CHARS = 500;
const MAX_SMALL_FILE = 1024 * 1024;

export type Job = {
	id: number,
	repoUrl: string,
	commit?: string,
};

export class BuildError extends Error {}

const output = (command: string, args: string[]) => new Promise<string>((resolve, reject) => {
	const child = spawn(command, args);
	let out = '';
	child.stdout.on('data', (chunk: Buffer) => out += chunk.toString());
	child.on('close', code => code === 0
		? resolve(out)
		: reject(new Error(`${command} ${args[0]} exited with ${code}`)));
});

/** Run a script in a fresh locked-down container with the work dir at /w. */
const docker = (
	work: string,
	network: string,
	script: string,
	env: Record<string, string>,
	log: string[],
) =>
	new Promise<void>((resolve, reject) => {
		const name = `oss-idle-addon-${process.pid}-${Date.now()}`;
		const args = [
			'run', '--rm', '--name', name,
			'--network', network,
			'--user', `${process.getuid!()}:${process.getgid!()}`,
			'--read-only', '--tmpfs', '/tmp:rw,size=256m',
			'--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
			'--cpus', '2', '--memory', '2g', '--pids-limit', '512',
			'-v', `${work}:/w`, '-w', '/w',
			'-e', 'HOME=/w/home', '-e', 'npm_config_cache=/w/npm-cache',
			'-e', 'GIT_TERMINAL_PROMPT=0',
			...Object.entries(env).flatMap(([k, v]) => ['-e', `${k}=${v}`]),
			IMAGE, 'sh', '-ec', script,
		];
		const child = spawn('docker', args);
		const timer = setTimeout(() => {
			log.push(`timed out after ${STEP_TIMEOUT_MS / 60_000} minutes`);
			spawn('docker', ['kill', name]);
		}, STEP_TIMEOUT_MS);
		const take = (chunk: Buffer) => {
			const lines = chunk.toString().split('\n').filter(Boolean);
			log.push(...lines.map(line => line.slice(0, LOG_LINE_CHARS)));
			log.splice(0, Math.max(0, log.length - LOG_LINES));
		};
		child.stdout.on('data', take);
		child.stderr.on('data', take);
		child.on('close', code => {
			clearTimeout(timer);
			if (code === 0) resolve();
			else reject(new BuildError(`exited with ${code}`));
		});
	});

/**
 * Read a file a container left in the work dir: a plain file, reached through no
 * symlink (it would point at this host's files), at most `max` bytes.
 */
export const readInside = async (root: string, rel: string, max: number) => {
	const file = path.resolve(root, rel);
	const real = await realpath(file).catch(() => {
		throw new BuildError(`${rel} is missing`);
	});
	const info = await lstat(real);
	if (real !== file || !real.startsWith(root + path.sep) || !info.isFile()) {
		throw new BuildError(`${rel} must be a plain file inside the repository`);
	}
	if (info.size > max) throw new BuildError(`${rel} is over ${Math.round(max / 1024)} KB`);
	const handle = await open(real, 'r');
	try {
		const buffer = Buffer.alloc(info.size);
		await handle.read(buffer, 0, buffer.length, 0);
		return { text: buffer.toString('utf8') };
	} finally {
		await handle.close();
	}
};

const checkHost = async (repoUrl: string) => {
	const { hostname } = new URL(repoUrl);
	const addresses = await lookup(hostname.replace(/^\[|\]$/g, ''), { all: true }).catch(() => {
		throw new BuildError(`${hostname} does not resolve`);
	});
	if (addresses.some(a => isInternal(a.address))) throw new BuildError(`${hostname} is not a public address`);
};

/** Refuse to build while the build network reaches this host or the LAN. */
export const checkIsolation = async () => {
	if (['host', 'none', 'bridge', 'default'].includes(NETWORK)) {
		throw new Error(`ADDON_BUILDER_NETWORK must be a network of its own, not ${NETWORK}`);
	}
	const gateways = (await output('docker', [
		'network', 'inspect', '-f', '{{range .IPAM.Config}}{{.Gateway}} {{end}}', NETWORK,
	])).split(/\s+/).filter(Boolean);
	const work = await mkdtemp(path.join(WORK, 'oss-idle-probe-'));
	const log: string[] = [];
	try {
		await docker(work, NETWORK, 'node -e "$PROBE"', {
			PROBE: PROBE_SCRIPT, TARGETS: isolationTargets(gateways).join(','),
		}, log);
	} finally {
		await rm(work, {
			recursive: true, force: true,
		});
	}
	const reached = log.filter(line => line.startsWith('reachable '));
	if (reached.length) throw new Error(`${NETWORK} is not isolated: ${reached.join(', ')}`);
};

const GIT = 'git -c http.followRedirects=false -c protocol.allow=never -c protocol.https.allow=always';

/** Clone the commit, before any of its code runs. */
const fetchSource = (work: string, job: Job, commit: string, log: string[]) =>
	docker(work, NETWORK, [
		`${GIT} clone -q "$URL" repo`,
		'cd repo',
		'git -c advice.detachedHead=false checkout -q "$COMMIT"',
	].join('\n'), {
		URL: job.repoUrl, COMMIT: commit,
	}, log);

/** The built file `addon.config.json` names, once the author's build is over. */
const readBundle = async (repo: string) => {
	const { text } = await readInside(repo, 'addon.config.json', MAX_SMALL_FILE);
	const config = (() => {
		try { return JSON.parse(text) as Record<string, unknown> | null; }
		catch { throw new BuildError('addon.config.json is not valid JSON'); }
	})() ?? {};
	if (typeof config.outfile !== 'string') throw new BuildError('addon.config.json has no outfile');
	const bundle = await readInside(repo, config.outfile, MAX_ADDON_BUNDLE);
	return {
		bundle: bundle.text,
		gameVersion: typeof config.gameVersion === 'string' ? config.gameVersion.slice(0, 20) : undefined,
	};
};

const build = async (job: Job, work: string, log: string[]): Promise<AddonBuildResult> => {
	await checkHost(job.repoUrl);

	log.push('$ git ls-remote --tags');
	await docker(work, NETWORK, `${GIT} ls-remote --tags "$URL" > /w/tags`, { URL: job.repoUrl }, log);
	const newest = newestTag((await readInside(work, 'tags', MAX_SMALL_FILE)).text);
	if (!newest) throw new BuildError('No version tag (v1.2.3) in the repository');
	if (newest.commit === job.commit) return { outcome: 'unchanged' };
	log.push(`building ${newest.tag} (${newest.commit})`);

	await fetchSource(work, job, newest.commit, log);

	// no install scripts, and no git: a repository's .npmrc can point `git` at its own script
	log.push('$ npm ci');
	const install = 'npm ci --ignore-scripts --git=/bin/false --no-audit --no-fund';
	await docker(work, NETWORK, `cd repo && ${install}`, {}, log);

	log.push('$ npm run build');
	await docker(work, 'none', 'cd repo && npm run build', {}, log);

	const built = await readBundle(path.join(work, 'repo'));
	log.push(`built, ${Math.round(built.bundle.length / 1024)} KB`);
	return {
		outcome: 'built',
		tag: newest.tag,
		commit: newest.commit,
		...built,
		log: log.join('\n'),
	};
};

/** Build a job in a work dir of its own, removed after; a failure is the result's log. */
export const buildAddon = async (job: Job): Promise<AddonBuildResult> => {
	const work = await realpath(await mkdtemp(path.join(WORK, 'oss-idle-addon-')));
	await mkdir(path.join(work, 'home'));
	const log: string[] = [];
	try {
		return await build(job, work, log);
	} catch (e) {
		if (!(e instanceof BuildError)) console.error(e);
		log.push(e instanceof BuildError ? e.message : 'The builder failed');
		return {
			outcome: 'failed', log: log.join('\n'),
		};
	} finally {
		await rm(work, {
			recursive: true, force: true,
		});
	}
};
