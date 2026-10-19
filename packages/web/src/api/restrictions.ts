import {
	rpc,
	unwrap,
} from './client';

/** Moderators: every restricted account, newest first. */
export const listRestricted = () => unwrap(rpc.v1.restrictions.$get());

export type RestrictedAccount = Awaited<ReturnType<typeof listRestricted>>[number];

export const restrictAccount = (userId: number, reason: string) =>
	unwrap(rpc.v1.restrictions[':userId'].$put({
		param: { userId: String(userId) }, json: { reason },
	}));

export const liftRestriction = (userId: number) =>
	unwrap(rpc.v1.restrictions[':userId'].$delete({ param: { userId: String(userId) } }));

/** Moderators: silence for `seconds`, or until lifted with 0. */
export const silenceAccount = (userId: number, seconds: number, reason: string) =>
	unwrap(rpc.v1.restrictions[':userId'].silence.$put({
		param: { userId: String(userId) }, json: {
			seconds, reason,
		},
	}));

export const liftSilence = (userId: number) =>
	unwrap(rpc.v1.restrictions[':userId'].silence.$delete({ param: { userId: String(userId) } }));

/** osu-web's Account Standing: for the player and the moderators. */
export const getStanding = (userId: number) =>
	unwrap(rpc.v1.users[':id'].standing.$get({ param: { id: String(userId) } }));
