import { xpForLevel } from '@oss-idle/shared/sim/skills/xp';

/** Progress into the next level as a whole percent, 0 to 99: osu!'s `level.progress`. */
export const levelPercent = (level: number, xp: number): number => {
	const needed = xpForLevel(level);
	return needed > 0 ? Math.min(99, Math.floor(Math.max(0, xp / needed) * 100)) : 0;
};
