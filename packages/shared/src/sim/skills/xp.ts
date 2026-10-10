import cubic_bezier from '../../math/cubic_bezier.js';

const progressionCurve = cubic_bezier(.1, .4, .95, 0);
const lateProgressionCurve = cubic_bezier(.5, 0, 1, .4);

export const LATE_LEVEL_XP = 10_000_000;

export const lateLevelXp = (level: number): number => {
	if (level < 100) return 0;
	const steps = level - 99;
	return steps * (steps + 1) / 2 * LATE_LEVEL_XP;
};

export const xpForLevel = (level: number): number => {
	return 100
		+ (progressionCurve(level / 100) * 9900)
		+ (lateProgressionCurve((level - 60) / 40) * 90000)
		+ lateLevelXp(level);
};

export const xpToLevel = (level: number): number => {
	let total = 0;
	for (let i = 0; i < level; i++) {
		total += xpForLevel(i);
	}
	return total;
};

export const xpGivesLevel = (xp: number): { level: number, xp: number } => {
	let level = 0;
	do {
		const nextXP = xpForLevel(level);
		if (xp < nextXP) break;
		xp -= nextXP;
		level++;
	} while(true);
	
	return {
		level,
		xp,
	};
};
