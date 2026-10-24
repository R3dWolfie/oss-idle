/**
 * osu!'s global rank tiers (osu-web resources/js/profile-page/rank.tsx), on shares
 * sized for a small player base so every tier has players.
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
export const rankTier = (rank?: number, percent?: number): RankTier | undefined => {
	if (rank === undefined || percent === undefined) return undefined;
	return SHARES.find(([tier, share]) => percent < share
		&& (tier !== 'lustrous' || rank <= LUSTROUS_MAX_RANK))?.[0];
};

/** #1 gets a look of its own on top of lustrous. */
export const isFirst = (rank?: number): boolean => rank === 1;

/** Each tier's gradient, top to bottom (osu-web resources/css/layout.less --level-tier-*). */
const RANK_TIER_COLOURS: Record<RankTier, [string, string]> = {
	lustrous: ['#ffe600', '#ed82ff'],
	radiant: ['#97dcff', '#ed82ff'],
	rhodium: ['#d9f8d3', '#a0cf96'],
	platinum: ['#a8f0ef', '#52e0df'],
	gold: ['#f0e4a8', '#e0c952'],
	silver: ['#e0e0eb', '#a3a3c2'],
	bronze: ['#b88f7a', '#855c47'],
	iron: ['#bab3ab', '#bab3ab'],
};

export const rankTierGradient = (tier: RankTier): string =>
	`linear-gradient(${RANK_TIER_COLOURS[tier][0]}, ${RANK_TIER_COLOURS[tier][1]})`;
