import Synced from '@oss-idle/shared/helpers/synced';

import Auth from './auth';
import { rpc } from './client';

const api = rpc.v1.social.friends;

/** The accounts the signed-in player added, by user id. Empty when signed out. */
export const friends = new Synced<ReadonlySet<number>>(new Set());
/** Of those, the ones who added them back (the server's `mutual`). */
export const mutuals = new Synced<ReadonlySet<number>>(new Set());

const load = async (): Promise<void> => {
	try {
		const res = await api.$get();
		if (!res.ok) return;
		const list = await res.json();
		void friends.set(new Set(list.map(f => f.userId)));
		void mutuals.set(new Set(list.filter(f => f.mutual).map(f => f.userId)));
	} catch (e) {
		console.warn('[friends] could not load the friend list', e);
	}
};

void Auth.user.sync(user => {
	if (user) void load();
	else {
		void friends.set(new Set());
		void mutuals.set(new Set());
	}
});

export const addFriend = async (userId: number): Promise<void> => {
	const res = await api[':userId'].$put({ param: { userId: String(userId) } });
	if (!res.ok) throw new Error(`Could not add friend (${res.status})`);
	void friends.set(new Set([...friends.get(), userId]));
	if ((await res.json()).mutual) void mutuals.set(new Set([...mutuals.get(), userId]));
};

export const removeFriend = async (userId: number): Promise<void> => {
	const res = await api[':userId'].$delete({ param: { userId: String(userId) } });
	if (!res.ok) throw new Error(`Could not remove friend (${res.status})`);
	const next = new Set(friends.get());
	next.delete(userId);
	void friends.set(next);
	const mutual = new Set(mutuals.get());
	mutual.delete(userId);
	void mutuals.set(mutual);
};
