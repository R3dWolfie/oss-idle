/** osu!'s user groups. Admins manage the team and everything else; the Global Moderation
 *  Team applies every sanction. */
export const GROUPS = ['admin', 'gmt'] as const;
export type Group = typeof GROUPS[number];

/** The profile badge's short name, its hover name and the group's colour (badge, profile title). */
export const GROUP_BADGE: Record<Group, { short: string; name: string; colour: string }> = {
	admin: {
		short: 'ADM', name: 'Administrators', colour: '#b06cff',
	},
	gmt: {
		short: 'GMT', name: 'Global Moderation Team', colour: '#99eb47',
	},
};

/** Adri: always an admin, and the curator of the ranked maps nobody proposed. */
export const OWNER_ID = 4579132;

export const isAdmin = (groups?: readonly Group[]): boolean => !!groups?.includes('admin');

/** May apply sanctions and handle reports. */
export const isModerator = (groups?: readonly Group[]): boolean =>
	isAdmin(groups) || !!groups?.includes('gmt');
