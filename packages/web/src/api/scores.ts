import {
	rpc,
	unwrap,
} from './client';

/** Public: one score with its map, player and rank on the map. */
export const getScore = (id: number | string) =>
	unwrap(rpc.v1.scores[':id'].show.$get({ param: { id: String(id) } }));
