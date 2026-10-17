/**
 * Beatmap nomination status, shared so the server schema + route validation and
 * the web nomination UI agree on one set of values.
 *
 * - `pending`  uploaded, not scheduled (no rankedAt yet)
 * - `ranked`   scheduled/live - live once rankedAt has passed
 * - `rejected` pulled from the queue
 */
export const BEATMAP_STATUS = ['pending', 'ranked', 'rejected'] as const;
export type BeatmapStatus = (typeof BEATMAP_STATUS)[number];

/**
 * The startup intro set (nekodex - circles!). It's a standard-mode map, not a
 * ranked mania beatmap, so it's the one set ingested regardless of mode and kept
 * out of the website's ranked listings - it's only used for the intro sequence.
 */
export const INTRO_SET_ID = 355322;

export type MapCover = {
	id: number;
	osuId: number | null;
	/** one of its difficulties' preview background */
	background?: string | null;
};

/** A set's cover: osu!'s when it is on osu!, else our own preview background. */
export const mapCoverUrl = (set: MapCover, size: 'list' | 'cover', apiBase = '') => {
	if (set.osuId) return `https://assets.ppy.sh/beatmaps/${set.osuId}/covers/${size}.jpg`;
	if (set.background) return `${apiBase}/v1/beatmap/preview/${set.id}/${set.background}`;
};

/** A set's page on osu!, when it is on osu!. */
export const osuSetUrl = (osuSetId: number | null | undefined) => osuSetId
	? `https://osu.ppy.sh/beatmapsets/${osuSetId}`
	: undefined;
