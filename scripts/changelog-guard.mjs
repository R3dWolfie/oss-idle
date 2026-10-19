#!/usr/bin/env node
// Claude Code PreToolUse hook (Bash), registered in .claude/settings.json: blocks an
// agent's `git merge <branch>` into develop when the branch changes player-facing
// code without a changelog/pending entry or a `Changelog: none` commit line.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PLAYER_CODE = /^packages\/(client|web|server|shared|desktop)\/src\/(?!.*\.test\.tsx?$)/;
const PENDING = /^changelog\/pending\/[^/]+\.md$/;
const VALUE_FLAGS = new Set([
	'-m', '-F', '-s', '-X', '--strategy', '--strategy-option', '--file', '--message',
]);

const git = (cwd, ...args) => execFileSync('git', args, {
	cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
}).trim();

// Each `git [-C dir] merge ...` in the command: the repo it runs in and its branches.
function merges(command, cwd) {
	const found = [];
	let dir = cwd;
	for (const part of command.replace(/"[^"]*"|'[^']*'/g, 'Q').split(/&&|\|\||;|\n/)) {
		const words = part.trim().split(/\s+/);
		if (words[0] === 'cd' && words[1]) {
			dir = resolve(dir, words[1]);
			continue;
		}
		if (words[0] !== 'git') continue;
		let i = 1;
		let repo = dir;
		while (words[i]?.startsWith('-')) {
			if (words[i] === '-C') repo = resolve(dir, words[i + 1]);
			i += words[i] === '-C' || words[i] === '-c' ? 2 : 1;
		}
		if (words[i] !== 'merge') continue;
		const branches = [];
		for (let j = i + 1; j < words.length; j++) {
			if (VALUE_FLAGS.has(words[j])) j++;
			else if (!words[j].startsWith('-')) branches.push(words[j]);
		}
		found.push({
			repo, branches, 
		});
	}
	return found;
}

function missingEntry(repo, branch) {
	try {
		if (branch === 'develop' || git(repo, 'branch', '--show-current') !== 'develop') return false;
		git(repo, 'rev-parse', '--verify', '--quiet', `refs/heads/${branch}`);
	} catch {
		return false; // not a repo, or not a local branch (origin/develop, public/main)
	}
	const changed = git(repo, 'diff', '--name-only', `develop...${branch}`).split('\n');
	if (!changed.some(f => PLAYER_CODE.test(f))) return false;
	const added = git(repo, 'diff', '--name-only', '--diff-filter=AM', `develop...${branch}`)
		.split('\n');
	if (added.some(f => PENDING.test(f))) return false;
	return !/^Changelog: none$/m.test(git(repo, 'log', '--format=%B', `develop..${branch}`));
}

const input = JSON.parse(readFileSync(0, 'utf8'));
const command = input.tool_input?.command ?? '';
const cwd = input.cwd ?? process.cwd();
for (const { repo, branches } of merges(command, cwd)) {
	const branch = branches.find(b => missingEntry(repo, b));
	if (!branch) continue;
	const file = `changelog/pending/${branch.replace(/^claude\//, '').replace(/\//g, '-')}.md`;
	process.stderr.write(
		`Merge blocked: ${branch} changes player-facing code but adds no changelog entry.\n`
		+ `On the branch, add ${file} with one \`add|fix[!] [Category] title\` line per `
		+ 'player-visible change (format, categories and wording rules: CLAUDE.md, "Per-build '
		+ 'changelog"), or extend a pending file this feature already has. Commit it, then merge again.\n'
		+ 'If players can see none of it, record that instead: '
		+ '`git commit --allow-empty -m "<why>" -m "Changelog: none"` on the branch.\n',
	);
	process.exit(2);
}
