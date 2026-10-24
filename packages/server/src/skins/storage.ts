import { createHash } from 'node:crypto';
import {
	mkdir,
	rename,
	rm,
	stat,
	writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import AdmZip from 'adm-zip';
import {
	inArray,
	sql,
} from 'drizzle-orm';
import {
	isSkinFile,
	normalizePath,
	skinFileName,
	unwrapArchive,
} from '@oss-idle/shared/osuSkin/files';
import {
	SKIN_FILES_MAX,
	SKIN_UNPACKED_MAX,
} from '@oss-idle/shared/skin';
import { db } from '../db/client';
import { skinFiles } from '../db/schema/skin';

/**
 * Skin files on disk, one per distinct content: `<sha256>.<ext>`, so two skins (or two
 * versions of one) sharing an image store it once. Like the beatmap corpus, it lives
 * outside any build output and survives every deploy. Served as-is at {@link SKIN_ROUTE}.
 */
export const SKIN_DIR = './skins';
export const SKIN_ROUTE = '/skin-files';

export class SkinRefused extends Error {}

export type StoredFile = { path: string, hash: string, size: number };

/** Unpack an .osk and store its files; returns them as the skin names them. Files no
 *  skin holds (editor projects, a .git folder, ...) are left out. */
export const storeOsk = async (buffer: Buffer): Promise<StoredFile[]> => {
	let zip: AdmZip;
	try {
		zip = new AdmZip(buffer);
	} catch {
		throw new SkinRefused('This is not an .osk file');
	}
	const entries = zip.getEntries().filter(e => !e.isDirectory && isSkinFile(e.entryName));
	// an entry saying it holds nothing inflates without a cap: one with data behind it lies
	const lying = entries.some(e => e.header.size === 0 && e.header.compressedSize > 64);
	if (lying || entries.reduce((total, e) => total + e.header.size, 0) > SKIN_UNPACKED_MAX) {
		throw new SkinRefused('This skin is too big unpacked');
	}
	if (entries.length > SKIN_FILES_MAX) throw new SkinRefused('This skin has too many files');
	if (!entries.length) throw new SkinRefused('There are no skin files in this .osk');

	const byName = unwrapArchive(Object.fromEntries(entries.map(e => [e.entryName, e])));
	const seen = new Set<string>();
	const files: StoredFile[] = [];
	await mkdir(SKIN_DIR, { recursive: true });
	for (const [path, entry] of Object.entries(byName)) {
		const key = normalizePath(path);
		// stable reads names case-blind: the first of two that only differ by case wins
		if (seen.has(key) || path.length > 512) continue;
		seen.add(key);
		let data: Buffer;
		try {
			data = entry.getData();
		} catch {
			throw new SkinRefused('This .osk is damaged');
		}
		const hash = createHash('sha256').update(data).digest('hex');
		const target = join(SKIN_DIR, skinFileName(hash, path));
		if (!await stat(target).catch(() => undefined)) {
			const tmp = `${target}.${process.pid}.tmp`;
			await writeFile(tmp, data);
			await rename(tmp, target);
		}
		files.push({
			path: path.replace(/\\/g, '/'), hash, size: data.length,
		});
	}
	return files;
};

/** Delete the files of `files` no skin uses any more. */
export const dropUnused = async (files: { hash: string, path: string }[]) => {
	if (!files.length) return;
	const hashes = [...new Set(files.map(f => f.hash))];
	const used = new Set((await db.select({ hash: skinFiles.hash }).from(skinFiles)
		.where(inArray(skinFiles.hash, hashes))
		.groupBy(sql`${skinFiles.hash}`)).map(r => r.hash));
	await Promise.all(files
		.filter(f => !used.has(f.hash))
		.map(f => rm(join(SKIN_DIR, skinFileName(f.hash, f.path)), { force: true })));
};
