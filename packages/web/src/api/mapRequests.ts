import {
	rpc,
	unwrap,
} from './client';
import type { BeatmapRequestStatus } from '@osu-idle/shared/beatmapRequest';

/** Public: every ranking proposition, with its backers and nomination state. */
export const listMapRequests = () => unwrap(rpc.v1.beatmap.request.$get());

/** One row of the request queue, inferred from the route. */
export type MapRequest = Awaited<ReturnType<typeof listMapRequests>>[number];

/** Public: 4K mania sets matching what the player typed, from the beatmap mirror. */
export const searchMapRequests = (q: string) =>
	unwrap(rpc.v1.beatmap.request.search.$get({ query: { q } }));

/** One search hit, inferred from the route. */
export type MapSearchHit = Awaited<ReturnType<typeof searchMapRequests>>[number];

/** Submit a beatmapset (link or id) for ranking. */
export const submitMapRequest = (map: string) =>
	unwrap(rpc.v1.beatmap.request.$post({ json: { map } }));

/** Back a request, or take the backing away. */
export const toggleMapSupport = (setId: number) =>
	unwrap(rpc.v1.beatmap.request[':setId'].support.$post({ param: { setId: String(setId) } }));

/** Withdraw your own open request (admins can drop any). */
export const deleteMapRequest = (setId: number) =>
	unwrap(rpc.v1.beatmap.request[':setId'].$delete({ param: { setId: String(setId) } }));

/** Admin: resolve a request, with a reason players can read. */
export const resolveMapRequest = (setId: number, status: BeatmapRequestStatus, note?: string) =>
	unwrap(rpc.v1.beatmap.request[':setId'].$patch({
		param: { setId: String(setId) },
		json: {
			status, note,
		},
	}));

/** Admin: pull the .osz off the mirror and push it into the nomination queue. */
export const ingestMapRequest = (setId: number) =>
	unwrap(rpc.v1.beatmap.request[':setId'].ingest.$post({ param: { setId: String(setId) } }));

/** Temporary: the ranked maps nobody proposed, and which of them the player claims. */
export const getMapClaims = () => unwrap(rpc.v1.beatmap.claim.$get());

/** Replace the player's claims with this selection. */
export const saveMapClaims = (setIds: number[]) =>
	unwrap(rpc.v1.beatmap.claim.$put({ json: { setIds } }));

/** Admin: every open claim. */
export const listMapClaims = () => unwrap(rpc.v1.beatmap.claim.admin.$get());

export type MapClaim = Awaited<ReturnType<typeof listMapClaims>>[number];

const claimParam = (setId: number, userId: number) => ({
	param: {
		setId: String(setId), userId: String(userId),
	},
});

/** Admin: attribute the map to this claimer. */
export const acceptMapClaim = (setId: number, userId: number) =>
	unwrap(rpc.v1.beatmap.claim[':setId'][':userId'].$post(claimParam(setId, userId)));

/** Admin: drop one claim. */
export const rejectMapClaim = (setId: number, userId: number) =>
	unwrap(rpc.v1.beatmap.claim[':setId'][':userId'].$delete(claimParam(setId, userId)));
