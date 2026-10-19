import type { Group } from '@oss-idle/shared/groups';
import {
	rpc,
	unwrap,
} from './client';

/** Admin: every group's members. */
export const getTeam = () => unwrap(rpc.v1.team.$get());

export type TeamMember = Awaited<ReturnType<typeof getTeam>>['members'][number];

export const addToGroup = (group: Group, userId: number) =>
	unwrap(rpc.v1.team[':group'][':userId'].$put({
		param: {
			group, userId: String(userId),
		},
	}));

export const removeFromGroup = (group: Group, userId: number) =>
	unwrap(rpc.v1.team[':group'][':userId'].$delete({
		param: {
			group, userId: String(userId),
		},
	}));
