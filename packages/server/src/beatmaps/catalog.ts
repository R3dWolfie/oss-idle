import { statSync } from 'node:fs';
import {
	and,
	eq,
	isNotNull,
	isNull,
	like,
	lte,
	max,
	ne,
	or,
	sql,
	sum,
	type SQL,
} from 'drizzle-orm';
import {
	INTRO_SET_ID,
	type MapTag,
	parseMapTags,
	type PanelDiff,
} from '@oss-idle/shared/beatmap';
import { db } from '../db/client';
import { likeEscape } from '../db/columns';
import { redis } from '../redis';
import { redisKeyPrefix } from '../env';
import { hub } from '../ws/hub';
import { beatmaps } from '../db/schema/beatmap';
import { beatmapset } from '../db/schema/beatmapset';
import { oszPath } from './storage';

/** What a set's panel shows besides the set itself, over the `beatmaps` joined to it:
 *  plays, a cover, the preview track and the difficulties. */
export const panelColumns = () => ({
	plays: sum(beatmaps.plays),
	background: max(beatmaps.background),
	audio: max(beatmaps.audio),
	diffs: sql<PanelDiff[]>`json_arrayagg(json_object('id', ${beatmaps.id},
		'version', ${beatmaps.version}, 'sr', ${beatmaps.sr}, 'keys', ${beatmaps.keys}))`
		.mapWith(value => (typeof value === 'string' ? JSON.parse(value) : value) as PanelDiff[]),
});

/** A set is live - listed, downloadable, previewable - only once it's ranked and
 *  its scheduled rank time has passed. Pending (null rankedAt) and future-dated
 *  sets are excluded (null <= now() is null, so they drop out). Reused by the
 *  public listing routes so the whole site shares one definition of "live". */
export const liveCondition = and(
	eq(beatmapset.status, 'ranked'),
	lte(beatmapset.rankedAt, sql`now()`),
);

/** Per-difficulty gate on top of `liveCondition`: a diff is live only when its
 *  set is live AND the diff itself is ranked. For queries joining `beatmaps`. */
export const liveDiffCondition = and(liveCondition, eq(beatmaps.ranked, true));

// Public listings show live sets (ranked diffs only) but never the intro (it's
// not a ranked map). Every listing joins `beatmaps`, so the diff gate applies.
export const listedCondition = and(liveDiffCondition, ne(beatmapset.id, INTRO_SET_ID));

const previewUrl = (setId: number, file: string | null) =>
	file ? `/v1/beatmap/preview/${setId}/${file}` : undefined;

/** A player's own upload that is still up and unranked: the one with a leaderboard. */
export const unrankedCondition = and(
	eq(beatmapset.status, 'unranked'),
	isNull(beatmapset.deletedAt),
);

/** A player's own map that is still up and not ranked: unranked, or waiting in the
 *  ranking queue - listed, downloadable and with its page either way. */
export const playerMapCondition = and(
	isNull(beatmapset.deletedAt),
	isNotNull(beatmapset.uploadedAt),
	or(eq(beatmapset.status, 'unranked'), eq(beatmapset.status, 'pending')),
);

/** Whether a single set is live, for gating the .osz + preview file routes. */
export const isSetLive = async (setId: number): Promise<boolean> => {
	const [row] = await db
		.select({ id: beatmapset.id })
		.from(beatmapset)
		.where(and(eq(beatmapset.id, setId), liveCondition))
		.limit(1);
	return !!row;
};

/** Whether anyone may download a set: a live one, or a player's own not ranked yet. */
export const isSetPublic = async (setId: number): Promise<boolean> => {
	const [row] = await db
		.select({ id: beatmapset.id })
		.from(beatmapset)
		.where(and(eq(beatmapset.id, setId), or(liveCondition, playerMapCondition)))
		.limit(1);
	return !!row;
};

// `runtime: false` marks a catalog entry the client hasn't downloaded yet, as
// opposed to its local runtime store of downloaded sets.
type CatalogVersion = {
	id: number;
	// its .osu inside the .osz; older rows only have their id in the file
	file?: string;
	runtime: false;
	version: string;
	difficulty: number;
	mode: number;
	keys: number;
	audio?: string;
	background?: string;
	total_length: number;
	bpm: number;
	objects: number;
	rice: number;
	ln: number;
	tags: MapTag[];
};

type CatalogSet = {
	id: number;
	runtime: false;
	title: string;
	artist: string;
	creator: string;
	background?: string;
	audio?: string;
	/** the .osz's size in bytes */
	size: number;
	/** listed in song select before it is downloaded */
	bundled: boolean;
	/** false for a player's own map not ranked yet */
	ranked: boolean;
	/** when it was ranked, or submitted for one not ranked */
	rankedAt: string;
	/** every difficulty's plays */
	plays: number;
	versions: CatalogVersion[];
};

export type Catalog = {
	intro?: CatalogSet;
	beatmaps: CatalogSet[];
};

/** Every set with a difficulty matching `where`, with those difficulties, catalog-shaped. */
const catalogSets = async (where: SQL | undefined): Promise<CatalogSet[]> => {
	const rows = await db
		.select({
			setId: beatmapset.id,
			artist: beatmapset.artist,
			title: beatmapset.title,
			creator: beatmapset.creator,
			bundled: beatmapset.bundled,
			status: beatmapset.status,
			rankedAt: beatmapset.rankedAt,
			submittedAt: beatmapset.submittedAt,
			b: beatmaps,
		})
		.from(beatmapset)
		.innerJoin(beatmaps, eq(beatmapset.id, beatmaps.setId))
		.where(where);

	const sets = new Map<number, CatalogSet>();
	for (const row of rows) {
		let set = sets.get(row.setId);
		if (!set) {
			set = {
				id: row.setId,
				runtime: false,
				title: row.title,
				artist: row.artist,
				creator: row.creator,
				bundled: row.bundled,
				ranked: row.status === 'ranked',
				rankedAt: (row.rankedAt ?? row.submittedAt).toISOString(),
				plays: 0,
				size: statSync(oszPath(row.setId), { throwIfNoEntry: false })?.size ?? 0,
				versions: [],
			};
			sets.set(row.setId, set);
		}

		const audio = previewUrl(row.setId, row.b.audio);
		const background = previewUrl(row.setId, row.b.background);

		set.versions.push({
			id: row.b.id,
			file: row.b.file ?? undefined,
			runtime: false,
			version: row.b.version,
			difficulty: Math.round(Number(row.b.sr) * 100) / 100,
			mode: row.b.mode,
			keys: row.b.keys,
			audio,
			background,
			total_length: row.b.total_length,
			bpm: row.b.bpm,
			objects: row.b.objects,
			rice: row.b.rice,
			ln: row.b.ln,
			tags: parseMapTags(row.b.tags),
		});

		set.plays += row.b.plays;
		set.audio ??= audio;
		set.background ??= background;
	}

	return [...sets.values()];
};

/** The live catalog: every ranked-and-due set with its difficulties, plus the
 *  intro set called out separately. Replaces the old static manifest.json. */
export const buildCatalog = async (): Promise<Catalog> => {
	const sets = await catalogSets(liveDiffCondition);
	return {
		intro: sets.find(set => set.id === INTRO_SET_ID), beatmaps: sets,
	};
};

const VERSION_KEY = `${redisKeyPrefix}catalog:version`;
const PENDING_KEY = `${redisKeyPrefix}catalog:pending`;
const MAX_AGE = 60_000;
const BATCH = 5 * 60_000;

let cached: { version?: string, at: number, catalog: Promise<Catalog> } | undefined;

/** The catalog, built once per worker until invalidated (or a minute old, for plays). */
export const getCatalog = async (): Promise<Catalog> => {
	const version = await redis.get(VERSION_KEY) ?? undefined;
	if (!cached || cached.version !== version || Date.now() - cached.at > MAX_AGE) {
		const catalog = buildCatalog();
		cached = {
			version, at: Date.now(), catalog, 
		};
		catalog.catch(() => { if (cached?.catalog === catalog) cached = undefined; });
	}
	return cached.catalog;
};

/** The catalog changed: every worker rebuilds and connected clients refetch. */
export const invalidateCatalog = async (): Promise<void> => {
	await redis.del(PENDING_KEY);
	await redis.incr(VERSION_KEY);
	hub.broadcast({ type: 'catalog:invalidate' });
};

/** A change clients can wait for: sent with the others, 5 minutes after the first. */
export const deferCatalogInvalidate = async (): Promise<void> => {
	await redis.set(PENDING_KEY, Date.now(), 'NX');
};

export const flushCatalogInvalidate = async (): Promise<void> => {
	const since = Number(await redis.get(PENDING_KEY));
	if (since && Date.now() - since >= BATCH && await redis.del(PENDING_KEY)) await invalidateCatalog();
};

/** After a set edit: going live is sent at once, other changes to a live set are deferred. */
export const setLiveChanged = async (wasLive: boolean, isLive: boolean): Promise<void> => {
	if (isLive && !wasLive) await invalidateCatalog();
	else if (wasLive) await deferCatalogInvalidate();
};

/** What the public listing filters on. */
export const LIST_STATUSES = ['ranked', 'unranked', 'any'] as const;
export type ListStatus = (typeof LIST_STATUSES)[number];

/** The listed difficulties of a status: ranked ones, players' unranked uploads, or both. */
export const listCondition = (status: ListStatus) => {
	const unranked = and(playerMapCondition, ne(beatmapset.id, INTRO_SET_ID));
	if (status === 'ranked') return listedCondition;
	return status === 'unranked' ? unranked : or(listedCondition, unranked);
};

/** When a listed set got there: ranked, or uploaded for an unranked one. */
export const listedAt = sql`coalesce(${beatmapset.rankedAt}, ${beatmapset.submittedAt})`;

/** Sets whose title, artist or mapper contains `search`; everything without one. */
export const nameMatches = (search?: string) => {
	const term = search?.trim();
	if (!term) return undefined;
	const pattern = `%${likeEscape(term)}%`;
	return or(
		like(beatmapset.title, pattern),
		like(beatmapset.artist, pattern),
		like(beatmapset.creator, pattern),
	);
};

/** Every player's own map not ranked yet, catalog-shaped like the ranked catalog. */
export const unrankedSets = () => catalogSets(listCondition('unranked'));

/** One player's own map not ranked yet, catalog-shaped for the game to download it. */
export const unrankedSet = async (setId: number): Promise<CatalogSet | undefined> =>
	(await catalogSets(and(playerMapCondition, eq(beatmapset.id, setId))))[0];
