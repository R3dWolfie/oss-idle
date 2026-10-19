import Synced from '@oss-idle/shared/helpers/synced';
import { rpc } from './client';
import Auth from './auth';

const api = rpc.v1.social.friends;

/** The accounts the signed-in player added, by user id. Empty when signed out. */
export const friends = new Synced<ReadonlySet<number>>(new Set());

const load = async (): Promise<void> => {
	try {
		const res = await api.$get();
		if (res.ok) void friends.set(new Set((await res.json()).map(f => f.userId)));
	} catch (e) {
		console.warn('[friends] could not load the friend list', e);
	}
};

void Auth.user.sync(user => {
	if (user) void load();
	else void friends.set(new Set());
});

export const addFriend = async (userId: number): Promise<void> => {
	const res = await api[':userId'].$put({ param: { userId: String(userId) } });
	if (!res.ok) throw new Error(`Could not add friend (${res.status})`);
	void friends.set(new Set([...friends.get(), userId]));
};

export const removeFriend = async (userId: number): Promise<void> => {
	const res = await api[':userId'].$delete({ param: { userId: String(userId) } });
	if (!res.ok) throw new Error(`Could not remove friend (${res.status})`);
	const next = new Set(friends.get());
	next.delete(userId);
	void friends.set(next);
};
