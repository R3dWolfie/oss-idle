import {
	apiUrl,
	json,
	rpc,
	unwrap,
	withAuth,
} from './client';
import {
	mapCoverUrl,
	type BeatmapStatus,
	type MapCover,
} from '@oss-idle/shared/beatmap';

/** A set's cover as a CSS background-image: osu!'s, else our own preview. */
export const coverBackground = (set: MapCover, size: 'list' | 'cover') => {
	const url = mapCoverUrl(set, size, apiUrl(''));
	return url && `url('${url}')`;
};

/** Public: live general stats (online/playing counts, totals). */
export const getRecentMaps = () =>
	unwrap(rpc.v1.beatmap.recent.$get());

export const getAllMaps = (dir?: 'asc' | 'desc') =>
	unwrap(rpc.v1.beatmap.all[':dir'].$get({ param: { dir: dir ?? 'desc' } }));

export const getPopularMaps = (dir?: 'asc' | 'desc') =>
	unwrap(rpc.v1.beatmap.popular[':dir'].$get({ param: { dir: dir ?? 'desc' } }));

// --- Beatmap nomination (admin) ---

/** Admin: the full nomination queue (pending + ranked + rejected). */
export const listNominations = () => unwrap(rpc.v1.beatmap.nomination.$get());

/** One row of the nomination queue, inferred from the route. */
export type Nomination = Awaited<ReturnType<typeof listNominations>>[number];

/** Admin: ingest an uploaded .osz into the queue as a pending set. */
export const uploadBeatmap = async (file: File) => {
	const form = new FormData();
	form.append('file', file);
	const res = await fetch(apiUrl('/v1/beatmap/nomination'), withAuth({
		method: 'POST', body: form, 
	}));
	return json<{ setId: number; difficulties: number }>(res);
};

/** Admin: set the ranked date and/or status of a set. */
export const updateNomination = (
	setId: number, 
	body: { rankedAt?: string | null; status?: BeatmapStatus },
) =>
	unwrap(rpc.v1.beatmap.nomination[':setId'].$patch({
		param: { setId: String(setId) }, json: body, 
	}));

/** Admin: toggle one difficulty in/out of the set's ranked lineup. */
export const setDiffRanked = (setId: number, beatmapId: number, ranked: boolean) =>
	unwrap(rpc.v1.beatmap.nomination[':setId'].beatmap[':beatmapId'].$patch({
		param: {
			setId: String(setId), beatmapId: String(beatmapId),
		},
		json: { ranked },
	}));

/** Admin: drop a set (rows + files) from the queue. */
export const deleteNomination = (setId: number) =>
	unwrap(rpc.v1.beatmap.nomination[':setId'].$delete({ param: { setId: String(setId) } }));

/** Public: a set and its live difficulties, easiest first. */
export const getMapset = (id: number | string) =>
	unwrap(rpc.v1.beatmap.set[':id'].$get({ param: { id: String(id) } }));

export type Mapset = Awaited<ReturnType<typeof getMapset>>;
export type MapDiff = Mapset['diffs'][number];

/** Public: a difficulty's leaderboard, worldwide, in one country, or among the viewer's friends. */
export const getMapBoard = (beatmapId: number, filter: { country?: string; friends?: boolean }) =>
	unwrap(rpc.v1.scores.beatmap[':beatmap'].board.$get({
		param: { beatmap: String(beatmapId) },
		query: {
			country: filter.country, friends: filter.friends ? '1' : undefined,
		},
	}));

export type BoardRow = Awaited<ReturnType<typeof getMapBoard>>[number];

/** A set's audio preview. */
export const previewUrl = (setId: number, file: string) =>
	apiUrl(`/v1/beatmap/preview/${setId}/${encodeURIComponent(file)}`);
