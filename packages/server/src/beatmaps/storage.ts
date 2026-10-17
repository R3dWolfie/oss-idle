import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import { db } from '../db/client';

/**
 * On-disk homes for the beatmap corpus and the generated previews. Deliberately
 * server-owned and **outside any build output** (like {@link UPLOAD_DIR}): no
 * client/web build writes here or can wipe it, so the downloadable content
 * survives every deploy. Paths are relative to the server's working directory.
 *
 * Names are derived from the set id, never the raw osu! folder names (full of
 * `#`, spaces and URL sub-delimiters that have bitten us before). One `.osz` per
 * set; previews are one file per *distinct* audio/background source in the set,
 * since difficulties can carry their own song/background - the first keeps the
 * bare `<setId>.mp3` / `<setId>.jpg`, the rest get `<setId>-audio2.mp3`,
 * `<setId>-bg2.jpg`, …
 */
export const BEATMAP_DIR = './beatmaps';
export const PREVIEW_DIR = './previews';

export const oszPath = (setId: number) => join(BEATMAP_DIR, `${setId}.osz`);
export const previewPath = (file: string) => join(PREVIEW_DIR, file);

const STAGING_FIRST_ID = 2_000_000_000;

/** Staging (a clone of prod) writes into prod's corpus: its new maps take ids from
 *  2e9 so their files never land on a prod map's name. Only ever raised: an id is
 *  never handed out twice, even once its map is deleted. */
export const separateStagingMapIds = async () => {
	for (const table of ['beatmapset', 'beatmap']) {
		const [rows] = await db.execute(sql`SELECT AUTO_INCREMENT AS next FROM information_schema.TABLES
			WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table}`);
		const [{ next }] = rows as unknown as { next: number }[];
		if (next >= STAGING_FIRST_ID) continue;
		await db.execute(sql.raw(`ALTER TABLE ${table} AUTO_INCREMENT = ${STAGING_FIRST_ID}`));
	}
};
