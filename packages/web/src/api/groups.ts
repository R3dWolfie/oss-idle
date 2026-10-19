import type { Group } from '@oss-idle/shared/groups';
import {
	rpc,
	unwrap,
} from './client';

/** Public: a group's members. */
export const getGroupMembers = (group: Group) =>
	unwrap(rpc.v1.groups[':group'].$get({ param: { group } }));
