import {
	rpc,
	unwrap,
} from './client';

/** Admin: every restricted account, newest first. */
export const listRestricted = () => unwrap(rpc.v1.restrictions.$get());

export type RestrictedAccount = Awaited<ReturnType<typeof listRestricted>>[number];

export const restrictAccount = (userId: number, reason: string) =>
	unwrap(rpc.v1.restrictions[':userId'].$put({
		param: { userId: String(userId) }, json: { reason },
	}));

export const liftRestriction = (userId: number) =>
	unwrap(rpc.v1.restrictions[':userId'].$delete({ param: { userId: String(userId) } }));
