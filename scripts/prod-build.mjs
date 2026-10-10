#!/usr/bin/env node
// Build prod in its own checkout (PROD_DIR, default ../idle-prod), the only tree
// systemd and Apache run from. This tree stays free for dev builds.
//
// Prod follows develop: deploys only run from develop, and every deploy ends with
// the prod checkout on develop's commit.
//
//   (default)  version-bump's --verify gate: the bump is not committed yet, so
//              build the working tree as it is about to be committed.
//   --follow   after version-bump committed: move prod onto develop's tip. Same
//              tree as the verified build (the usual case) needs no rebuild;
//              a different one (contributors merged from public on a release,
//              or uncommitted changes with no bump) is built.
//   --server   develop's tip, shared rebuilt only (no client/web/desktop).
//
// If a build fails, the prod checkout goes back to the commit it ran before.

import {
	execFileSync,
	spawnSync,
} from 'node:child_process';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
	dirname,
	join,
	resolve,
} from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROD = resolve(process.env.PROD_DIR ?? join(ROOT, '../idle-prod'));
const BRANCH = 'develop';
const mode = process.argv.includes('--follow') ? 'follow'
	: process.argv.includes('--server') ? 'server' : 'verify';

const git = (cwd, args, env) => execFileSync('git', args, {
	cwd, encoding: 'utf8', env: {
		...process.env, ...env,
	},
}).trim();

const run = command => spawnSync(command, {
	cwd: PROD, stdio: 'inherit', shell: true,
}).status === 0;

const short = sha => sha.slice(0, 9);
const treeOf = sha => git(ROOT, ['rev-parse', `${sha}^{tree}`]);

// What version-bump is about to commit (it runs `git add -A`).
const snapshot = () => {
	const index = resolve(ROOT, git(ROOT, ['rev-parse', '--git-path', 'prod-snapshot-index']));
	const env = { GIT_INDEX_FILE: index };
	try {
		git(ROOT, ['read-tree', 'HEAD'], env);
		git(ROOT, ['add', '-A'], env);
		const tree = git(ROOT, ['write-tree'], env);
		return git(ROOT, ['commit-tree', tree, '-p', 'HEAD', '-m', 'prod snapshot']);
	} finally {
		rmSync(index, { force: true });
	}
};

const checkout = (from, to) => {
	git(PROD, ['checkout', '--detach', '--force', to]);
	const lockChanged = git(PROD, ['diff', '--name-only', from, to, '--', 'package-lock.json']) !== '';
	return !lockChanged || run('npm ci');
};

const build = (previous, target, command) => {
	console.log(`[prod-build] ${PROD}: ${short(previous)} -> ${short(target)}`);
	if (checkout(previous, target) && run(command)) return;
	console.error(`\n[prod-build] failed - putting ${PROD} back on ${short(previous)}.`);
	checkout(target, previous);
	run('npm -w @osu-idle/shared run build');
	process.exit(1);
};

const branch = git(ROOT, ['branch', '--show-current']);
if (branch !== BRANCH) {
	const from = branch || 'a detached HEAD';
	console.error(`[prod-build] prod follows ${BRANCH}; refusing to deploy from "${from}".`);
	process.exit(1);
}

const previous = git(PROD, ['rev-parse', 'HEAD']);
const tip = git(ROOT, ['rev-parse', BRANCH]);

if (mode === 'verify') build(previous, snapshot(), 'node scripts/staged-build.mjs');
else if (mode === 'server') build(previous, tip, 'npm -w @osu-idle/shared run build');
else if (treeOf(previous) === treeOf(tip)) {
	git(PROD, ['checkout', '--detach', '--force', tip]);
	console.log(`[prod-build] prod is on ${BRANCH} (${short(tip)}), same tree as the verified build.`);
} else {
	console.log(`[prod-build] ${BRANCH} differs from the verified build - building it.`);
	build(previous, tip, 'node scripts/staged-build.mjs');
}

console.log('[prod-build] prod checkout updated. Restart osu-idle-prod to load the server.');
