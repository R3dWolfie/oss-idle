import {
	rpc,
	unwrap,
} from './client';

/** Admin: delete an account for good. `username` is its osu! username, typed again. */
export const deleteAccount = (userId: number, username: string) =>
	unwrap(rpc.v1.accounts[':userId'].$delete({
		param: { userId: String(userId) }, json: { username },
	}));
