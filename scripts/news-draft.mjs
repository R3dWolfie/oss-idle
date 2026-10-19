#!/usr/bin/env node
// A release (patch, minor or major bump) drafts its news post: every build since
// the last release/update post, in the light markdown the news editor's "Format
// changelog" button turns into HTML. The last post's version is the one
// version.ts held on develop when it was published.
//
//   node scripts/news-draft.mjs           print the draft for the current version
//   node scripts/news-draft.mjs --insert  save it as a draft on prod's news

import { execFileSync } from 'node:child_process';
import {
	readdirSync,
	readFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import {
	dirname,
	join,
} from 'node:path';
import {
	fileURLToPath,
	pathToFileURL,
} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHANGELOG = join(ROOT, 'changelog');
const VERSION_TS = 'packages/shared/src/version.ts';
const SITE = 'https://oss.idle.rhythmgamers.net/web';

const ENTRY = /^(add|fix)(!?) \[([^\]]+)\] (.+)$/;
// Badges of earlier posts (pages/news/changelog.ts); anything else is client.
const BADGE = {
	Website: 'web', Store: 'web', Rankings: 'web', Profile: 'web',
	Online: 'server', Balance: 'balance', Desktop: 'desktop',
};

const git = (...args) => execFileSync('git', args, {
	cwd: ROOT, encoding: 'utf8', 
}).trim();
const nums = v => v.split('.').map(Number);
const newer = (a, b) => {
	const [x, y] = [nums(a), nums(b)];
	const i = x.findIndex((n, j) => n !== y[j]);
	return i >= 0 && x[i] > y[i];
};

function versionAt(date) {
	const sha = git('log', '-1', `--before=${date.toISOString()}`, '--format=%H', '--', VERSION_TS);
	return sha ? /'([\d.]+)'/.exec(git('show', `${sha}:${VERSION_TS}`))[1] : '0';
}

function buildsAfter(version) {
	return readdirSync(CHANGELOG, { recursive: true })
		.filter(p => p.endsWith('.md') && !p.startsWith('pending'))
		.map(p => ({
			version: p.slice(p.lastIndexOf('/') + 1, -3), path: join(CHANGELOG, p), 
		}))
		.filter(b => newer(b.version, version))
		.sort((a, b) => (newer(a.version, b.version) ? 1 : -1));
}

export function draftContent(builds, previous) {
	const sections = {
		'Major Features': [], 'Minor Features': [], Bugfix: [], 
	};
	for (const { path } of builds) {
		for (const line of readFileSync(path, 'utf8').split('\n')) {
			const m = ENTRY.exec(line.trim());
			if (!m) continue;
			const [, type, major, category, title] = m;
			const section = type === 'fix' ? 'Bugfix' : major ? 'Major Features' : 'Minor Features';
			sections[section].push(`- [${BADGE[category] ?? 'client'}] ${title}`);
		}
	}
	const link = v => `[${v}](${SITE}/changelog/${v})`;
	const range = builds.length > 1
		? `${link(builds[0].version)} to ${link(builds.at(-1).version)}`
		: link(builds[0].version);
	const since = previous ? ` since [${previous.title}](${SITE}/news/${previous.slug})` : '';
	return [
		`Builds ${range}${since}.`,
		...Object.entries(sections).filter(([, lines]) => lines.length)
			.map(([heading, lines]) => `# ${heading}\n${lines.join('\n')}`),
	].join('\n\n');
}

// Saves the draft for `version` (MAJOR.MINOR.PATCH.BUILD). INSERT IGNORE on the
// slug, so a re-run never duplicates or overwrites an edited draft.
export async function createNewsDraft(version, { insert = true } = {}) {
	const require = createRequire(import.meta.url);
	require('dotenv').config({
		path: join(ROOT, 'packages/server/.env'), quiet: true, 
	});
	const { default: mysql } = await import('mysql2/promise');
	const db = await mysql.createConnection({
		host: process.env.DB_HOST,
		port: Number(process.env.DB_PORT ?? 3306),
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
		timezone: 'Z',
	});
	try {
		const [[previous]] = await db.query(
			`SELECT slug, title, author_id AS authorId, published_at AS publishedAt FROM news
			 WHERE published AND tag IN ('release', 'update') ORDER BY published_at DESC LIMIT 1`,
		);
		const builds = buildsAfter(previous ? versionAt(previous.publishedAt) : '0');
		if (!builds.length) return;
		const [major, minor, patch] = nums(version);
		const name = `${major}.${minor}.${patch}`;
		const draft = {
			slug: name.replaceAll('.', '-'),
			title: name,
			summary: previous ? `Changes since ${previous.title}` : 'Changes',
			content: draftContent(builds, previous),
			tag: patch ? 'update' : 'release',
			author_id: previous?.authorId,
		};
		if (!insert) {
			console.log(draft);
			return;
		}
		const [res] = await db.query('INSERT IGNORE INTO news SET ?', [draft]);
		console.log(res.affectedRows
			? `News draft "${name}" saved: ${builds.length} build(s), edit it at ${SITE}/news/admin.`
			: `News draft ${draft.slug} already exists, left as it is.`);
	} finally {
		await db.end();
	}
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
	await createNewsDraft(version, { insert: process.argv.includes('--insert') });
}
