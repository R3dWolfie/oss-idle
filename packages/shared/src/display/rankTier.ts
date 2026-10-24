/**
 * Global rank tiers: osu!'s eight (osu-web resources/js/profile-page/rank.tsx), on
 * shares sized for this game. osu!'s own (top 100, then 0.05% to 50%) are made for
 * millions of players: on a thousand only lustrous, bronze and iron would occur.
 * Each tier is about twice as exclusive as the next, lustrous stops at osu!'s top
 * 100, and the bottom half stays plain. Every tier keeps players at any size.
 */
export const RankTiers = [
	'lustrous', 'radiant', 'rhodium', 'platinum', 'gold', 'silver', 'bronze', 'iron',
] as const;
export type RankTier = (typeof RankTiers)[number];

/** The share of players a tier reaches down to, best first. */
const SHARES: [RankTier, number][] = [
	['lustrous', 0.003], ['radiant', 0.01], ['rhodium', 0.025], ['platinum', 0.05],
	['gold', 0.1], ['silver', 0.2], ['bronze', 0.35], ['iron', 0.5],
];
const LUSTROUS_MAX_RANK = 100;

/** `percent` is 0..1: the share of players with pp at or above `rank`. */
export const rankTier = (rank?: number | null, percent?: number | null): RankTier | undefined => {
	if (rank == null || percent == null) return undefined;
	return SHARES.find(([tier, share]) => percent < share
		&& (tier !== 'lustrous' || rank <= LUSTROUS_MAX_RANK))?.[0];
};

/** #1 has a look of its own on top of lustrous, as osu!'s in-game panel singles it out. */
export const isFirst = (rank?: number | null): boolean => rank === 1;

/** Each tier's gradient, top to bottom (osu-web resources/css/layout.less --level-tier-*). */
export const RANK_TIER_COLOURS: Record<RankTier, [string, string]> = {
	lustrous: ['#ffe600', '#ed82ff'],
	radiant: ['#97dcff', '#ed82ff'],
	rhodium: ['#d9f8d3', '#a0cf96'],
	platinum: ['#a8f0ef', '#52e0df'],
	gold: ['#f0e4a8', '#e0c952'],
	silver: ['#e0e0eb', '#a3a3c2'],
	bronze: ['#b88f7a', '#855c47'],
	iron: ['#bab3ab', '#bab3ab'],
};

/** The CSS gradient a tier paints its rank number with, top to bottom. */
export const rankTierGradient = (tier: RankTier): string =>
	`linear-gradient(${RANK_TIER_COLOURS[tier][0]}, ${RANK_TIER_COLOURS[tier][1]})`;
