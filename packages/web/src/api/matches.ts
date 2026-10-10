import {
	rpc,
	unwrap,
} from './client';

/** A multiplayer match's history (public, or the viewer played in it). */
export const getMatch = (id: number | string) =>
	unwrap(rpc.v1.matches[':id'].$get({ param: { id: String(id) } }));
