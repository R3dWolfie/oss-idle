import { starsAtRates } from '../pp';
import { execFileSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { extname } from 'node:path';
import AdmZip from 'adm-zip';
import '@osu-idle/shared/osu/controlPointPatch';
import { BeatmapDecoder } from 'osu-parsers';
import type {
	Beatmap,
	BeatmapMetadataSection,
} from 'osu-classes';
import { ManiaRuleset } from 'osu-mania-stable';
import * as rosu from 'rosu-pp-js';
import { INTRO_SET_ID } from '@osu-idle/shared/beatmap';
import {
	and,
	eq,
	isNull,
} from 'drizzle-orm';
import { db } from '../db/client';
import {
	beatmaps,
	type NewBeatmapRow,
} from '../db/schema/beatmap';
import { beatmapset } from '../db/schema/beatmapset';
import {
	BEATMAP_DIR,
	PREVIEW_DIR,
	oszPath,
	previewPath,
} from './storage';

/**
 * The single runtime beatmap pipeline - replaces the old client `index-beatmaps`
 * (manifest + previews) and server `ingest-beatmaps` (DB) scripts. Given a raw
 * `.osz`, it parses every mania difficulty, computes star rating + the rich
 * catalog metadata, generates the preview audio/background, stores the `.osz` and
 * previews under their set-id names, and upserts the `beatmapset` + `beatmap`
 * rows. It never touches `status`/`rankedAt`/`announced` on an existing set, so
 * re-ingesting (a re-upload) leaves its nomination state intact - new sets land
 * as `pending`. Ids are ours: osu!'s ids are kept in `osuId`, and the .osz is
 * stored as uploaded - the catalog names each difficulty's file inside it.
 */

const decoder = new BeatmapDecoder();
const mania = new ManiaRuleset();

export type IngestResult = {
	setId: number;
	osuSetId?: number;
	difficulties: number;
};

/** osu! writes 0 or -1 for a map it doesn't know. */
const osuId = (id: number | undefined) => id && id > 0 ? id : undefined;

/** The set this upload updates: by osu! id, else an unsubmitted set with the same metadata. */
const findSet = async (
	osuSetId: number | undefined,
	meta: { artist: string, title: string, creator: string },
) => {
	const [row] = await db.select().from(beatmapset).where(osuSetId !== undefined
		? eq(beatmapset.osuId, osuSetId)
		: and(
			isNull(beatmapset.osuId),
			eq(beatmapset.artist, meta.artist),
			eq(beatmapset.title, meta.title),
			eq(beatmapset.creator, meta.creator),
		)).limit(1);
	return row;
};

/** The difficulty this .osu updates: by osu! id, else by name within an unsubmitted set. */
const findBeatmap = async (
	setId: number,
	osuBeatmapId: number | null | undefined,
	version: string,
) => {
	const [row] = await db.select({ id: beatmaps.id }).from(beatmaps).where(osuBeatmapId
		? eq(beatmaps.osuId, osuBeatmapId)
		: and(eq(beatmaps.setId, setId), isNull(beatmaps.osuId), eq(beatmaps.version, version))).limit(1);
	return row?.id;
};

/** Finds or creates the set, keeping its nomination state. */
const upsertSet = async (metas: BeatmapMetadataSection[], allowRanked: boolean) => {
	// A pack can carry a stray -1 on some of its difficulties: the first real id wins.
	const osuSetId = metas.map(m => osuId(m.beatmapSetId)).find(id => id !== undefined);
	const meta = metas[0];
	const existing = await findSet(osuSetId, meta);
	const ranked = existing?.status === 'ranked';
	if (ranked && !allowRanked) throw new Error('Beatmap set is already ranked');

	// The intro must be live to be served, but it's never "nominated" - rank it
	// on first ingest (announced so the sweep skips it). Everything else lands as
	// pending. Re-ingest preserves status/rankedAt/announced either way.
	const intro = osuSetId === INTRO_SET_ID
		? {
			id: INTRO_SET_ID, status: 'ranked' as const, rankedAt: new Date(), announced: true,
		}
		: {};
	const setMeta = {
		artist: meta.artist, title: meta.title, creator: meta.creator,
	};
	let setId: number;
	if (existing) {
		setId = existing.id;
		await db.update(beatmapset).set({
			...setMeta, deletedAt: null,
		}).where(eq(beatmapset.id, setId));
	} else {
		[{ id: setId }] = await db.insert(beatmapset).values({
			...setMeta, osuId: osuSetId, ...intro,
		}).$returningId();
	}
	return {
		setId, osuSetId, ranked,
	};
};

/** Key count, star rating and note counts of one chart. */
const chartStats = (text: string, decoded: Beatmap) => {
	// Column count needs the mania ruleset; the intro is standard mode, so
	// guard it and leave keys at 0 there (the intro never needs a key count).
	let keys = 0;
	try { keys = mania.applyToBeatmap(decoded).totalColumns; } catch { /* non-mania intro */ }
	let sr = 0, bpm = 0, objects = 0, rice = 0, ln = 0;
	try {
		const map = new rosu.Beatmap(Buffer.from(text));
		sr = new rosu.Difficulty().calculate(map).stars;
		bpm = map.bpm;
		objects = map.nObjects;
		rice = map.nCircles;
		ln = map.nHolds;
		map.free();
	} catch { /* leave defaults if rosu can't read it */ }
	return {
		keys, sr, bpm, objects, rice, ln,
	};
};

/** Writes one difficulty. A ranked set's own difficulties are left as they are. */
const upsertBeatmap = async (
	row: Omit<NewBeatmapRow, 'id'>,
	setRanked: boolean,
	used: Set<number>,
) => {
	let id = await findBeatmap(row.setId, row.osuId, row.version);
	if (id === undefined || used.has(id)) {
		[{ id }] = await db.insert(beatmaps).values({
			...row,
			// Only 4K is playable - anything else lands (and stays) unranked. The
			// intro is standard-mode and must be live, so it's exempt.
			ranked: row.keys === 4 || row.setId === INTRO_SET_ID,
		}).$returningId();
	} else if (setRanked) {
		await db.update(beatmaps)
			.set({ file: row.file })
			.where(and(eq(beatmaps.id, id), eq(beatmaps.setId, row.setId)));
	} else {
		await db.update(beatmaps).set(row).where(eq(beatmaps.id, id));
	}
	return id;
};

/** `allowRanked` re-reads a ranked set's own stored file: its difficulties stay as
 *  they are, and the ones it never had are added like any other. */
export const ingestOsz = async (
	buffer: Buffer,
	{ allowRanked = false } = {},
): Promise<IngestResult> => {
	const zip = new AdmZip(buffer);
	const entries = zip.getEntries();
	const findEntry = (name: string) =>
		entries.find(e => e.entryName.toLowerCase() === name.toLowerCase());

	const parsed = entries
		.filter(e => e.entryName.toLowerCase().endsWith('.osu'))
		.flatMap(entry => {
			const text = entry.getData().toString('utf8');
			let decoded;
			try { decoded = decoder.decodeFromString(text); } catch { return []; }
			// mania-only, except the standard-mode intro set
			const isIntro = decoded.metadata.beatmapSetId === INTRO_SET_ID;
			if (decoded.originalMode !== 3 && !isIntro) return [];
			return [{
				entry, text, decoded,
			}];
		});

	if (parsed.length === 0) throw new Error('No mania difficulties in this .osz');

	const metas = parsed.map(p => p.decoded.metadata);
	const { setId, osuSetId, ranked } = await upsertSet(metas, allowRanked);

	mkdirSync(BEATMAP_DIR, { recursive: true });
	mkdirSync(PREVIEW_DIR, { recursive: true });

	// 1. Extract each distinct background / audio source once, named by set id.
	//    Difficulties sharing a source get the same preview filename.
	const bgAssets = new Map<string, string | undefined>();
	const audioAssets = new Map<string, string | undefined>();

	const resolveBackground = (bg: string | undefined): string | undefined => {
		if (!bg) return undefined;
		const key = bg.toLowerCase();
		if (bgAssets.has(key)) return bgAssets.get(key);
		const entry = findEntry(bg);
		if (!entry) { bgAssets.set(key, undefined); return undefined; }
		const ext = extname(bg) || '.jpg';
		const idx = bgAssets.size;
		const out = idx === 0 ? `${setId}${ext}` : `${setId}-bg${idx}${ext}`;
		writeFileSync(previewPath(out), entry.getData());
		bgAssets.set(key, out);
		return out;
	};

	const resolveAudio = (audio: string | undefined, previewTimeMs: number): string | undefined => {
		if (!audio) return undefined;
		const key = audio.toLowerCase();
		if (audioAssets.has(key)) return audioAssets.get(key);
		const entry = findEntry(audio);
		if (!entry) { audioAssets.set(key, undefined); return undefined; }
		const idx = audioAssets.size;
		const out = idx === 0 ? `${setId}.mp3` : `${setId}-audio${idx}.mp3`;
		const temp = previewPath(`${setId}_temp${idx}${extname(audio)}`);
		writeFileSync(temp, entry.getData());
		const start = previewTimeMs > 0 ? (previewTimeMs / 1000).toFixed(2) : '40.00';
		let result: string | undefined;
		try {
			execFileSync('ffmpeg', [
				'-y', '-ss', start, '-i', temp, '-t', '10',
				'-c:a', 'libmp3lame', '-q:a', '4', previewPath(out),
			], { stdio: 'ignore' });
			result = out;
		} catch (err) {
			console.error(`  ffmpeg failed to create preview for ${setId}:`, err);
		} finally {
			if (existsSync(temp)) rmSync(temp);
		}
		audioAssets.set(key, result);
		return result;
	};

	// 2. Build + upsert the difficulty rows.
	const used = new Set<number>();
	for (const { entry, text, decoded } of parsed) {
		const stats = chartStats(text, decoded);
		const osuBeatmapId = osuId(decoded.metadata.beatmapId);
		const row = {
			osuId: osuBeatmapId,
			setId,
			file: entry.entryName,
			chart: text,
			sr: String(Math.round(stats.sr * 1000) / 1000),
			rateStars: starsAtRates(text),
			artist: decoded.metadata.artist,
			title: decoded.metadata.title,
			version: decoded.metadata.version,
			keys: stats.keys,
			total_length: Math.round(decoded.totalLength),
			bpm: Math.round(stats.bpm),
			objects: stats.objects,
			rice: stats.rice,
			ln: stats.ln,
			mode: decoded.originalMode,
			audio: resolveAudio(decoded.general.audioFilename, decoded.general.previewTime),
			background: resolveBackground(decoded.events.backgroundPath ?? undefined),
		};

		const id = await upsertBeatmap(row, ranked, used);
		used.add(id);
	}

	// 3. Store the .osz keyed by set id.
	writeFileSync(oszPath(setId), buffer);

	return {
		setId, osuSetId, difficulties: used.size,
	};
};
