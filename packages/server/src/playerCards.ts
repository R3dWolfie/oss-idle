import { groupsByUser } from './groups';
import { resolveAvatarUrl } from './db/schema/character';
import { areOnline } from './ws/presence';
import { globalRanks } from './rankings';

type CardRow = {
	userId: number;
	country: string;
	lastActiveAt: Date | null;
	userAvatarUrl: string | null;
	character: { id: number; name: string; avatarUrl: string | null };
};

/** osu!web's user list entries (friends, a group): presence, global rank and groups. */
export const playerCards = async (rows: CardRow[]) => {
	const ids = rows.map(r => r.character.id);
	const [online, ranks, groups] = await Promise.all([
		areOnline(ids), globalRanks('pp', ids), groupsByUser(rows.map(r => r.userId)),
	]);
	return rows.map((r, i) => ({
		userId: r.userId,
		groups: groups.get(r.userId)!,
		online: online[i],
		lastActiveAt: r.lastActiveAt?.toISOString(),
		character: {
			id: r.character.id,
			name: r.character.name,
			avatarUrl: resolveAvatarUrl(r.character.avatarUrl, r.userAvatarUrl),
			country: r.country,
			rank: ranks[i],
		},
	}));
};
