import compareVersions from '@oss-idle/shared/helpers/compareVersions';

// changelog/<major>/<minor>/<patch>/<version>.md, written by scripts/version-bump.mjs:
// the date, a blank line, then one `add|fix[!] [Category] title` line per entry
// (`!` = major).
const files = import.meta.glob<string>([
	'../../../../../changelog/**/*.md',
	'!../../../../../changelog/pending/**',
], {
	query: '?raw', import: 'default', eager: true,
});

export const ENTRY = /^(add|fix)(!?) \[([^\]]+)\] (.+)$/;

export type Entry = { type: 'add' | 'fix'; major: boolean; category: string; title: string };
export type Build = { version: string; date: string; entries: Entry[] };

export const BUILDS: Build[] = Object.entries(files)
	.map(([path, raw]) => {
		const [date, ...lines] = raw.split('\n');
		return {
			version: path.slice(path.lastIndexOf('/') + 1, -'.md'.length),
			date: date.trim(),
			entries: lines.flatMap(line => {
				const m = ENTRY.exec(line.trim());
				return m ? [{
					type: m[1] as Entry['type'], major: m[2] === '!', category: m[3], title: m[4],
				}] : [];
			}),
		};
	})
	.sort((a, b) => compareVersions(b.version, a.version));
