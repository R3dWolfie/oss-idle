import type { ReportBody } from '@oss-idle/shared/social';
import {
	rpc,
	unwrap,
} from './client';

const friends = rpc.v1.social.friends;

/** The accounts the signed-in player added. */
export const getFriends = () => unwrap(friends.$get());

export const addFriend = (userId: number) =>
	unwrap(friends[':userId'].$put({ param: { userId: String(userId) } }));

export const removeFriend = (userId: number) =>
	unwrap(friends[':userId'].$delete({ param: { userId: String(userId) } }));

/** A profile's follower count, plus the viewer's side when signed in. */
export const getRelation = (userId: number) =>
	unwrap(rpc.v1.social.relation[':userId'].$get({ param: { userId: String(userId) } }));

export const block = (userId: number) =>
	unwrap(rpc.v1.social.blocks[':userId'].$put({ param: { userId: String(userId) } }));

export const unblock = (userId: number) =>
	unwrap(rpc.v1.social.blocks[':userId'].$delete({ param: { userId: String(userId) } }));

export const report = (userId: number, body: ReportBody) =>
	unwrap(rpc.v1.social.reports[':userId'].$post({
		param: { userId: String(userId) }, json: body,
	}));

/** Admin: the latest reports, open ones first. */
export const getReports = () => unwrap(rpc.v1.social.reports.$get());

export const resolveReport = (id: number) =>
	unwrap(rpc.v1.social.reports[':id'].resolve.$put({ param: { id: String(id) } }));
