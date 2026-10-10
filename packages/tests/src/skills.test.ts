import {
	describe,
	it,
	expect,
} from 'vitest';
import { makeOrderedSkills } from '@osu-idle/shared/sim/skills/factory';
import {
	LATE_LEVEL_XP,
	lateLevelXp,
	xpForLevel,
} from '@osu-idle/shared/sim/skills/xp';
import { SKILL } from '@osu-idle/shared/skills';
import Accuracy from '@osu-idle/shared/sim/skills/accuracy';

describe('xpForLevel curve', () => {
	it('costs exactly 100 to leave level 0', () => {
		expect(xpForLevel(0)).toBe(100);
	});

	it('is strictly increasing across the level range', () => {
		for (let level = 1; level <= 120; level++) {
			expect(xpForLevel(level)).toBeGreaterThan(xpForLevel(level - 1));
		}
	});

	it('grows the endgame tier by a whole step each level', () => {
		expect(lateLevelXp(99)).toBe(0);
		expect([100, 101, 102, 103, 104].map(lateLevelXp))
			.toEqual([1, 3, 6, 10, 15].map(n => n * LATE_LEVEL_XP));
		// the step itself is one more LATE_LEVEL_XP every level
		for (let level = 101; level <= 120; level++) {
			expect(lateLevelXp(level) - lateLevelXp(level - 1))
				.toBe((level - 99) * LATE_LEVEL_XP);
		}
	});
});

describe('Skill.gainXP', () => {
	it('levels up once when xp crosses the threshold, carrying the remainder', () => {
		const skill = makeOrderedSkills().find(s => s.name === SKILL.accuracy) as Accuracy;
		const gained = skill.gainXP(xpForLevel(0) + 1); // 101
		expect(gained).toBe(1);
		expect(skill.level.get()).toBe(1);
		expect(skill.xp.get()).toBeCloseTo(1, 10);
	});

	// TODO fix this is bullshit
	it('does NOT level up at exactly the threshold (strict >)', () => {
		const skill = makeOrderedSkills().find(s => s.name === SKILL.accuracy) as Accuracy;
		const gained = skill.gainXP(xpForLevel(0)); // exactly 100
		expect(gained).toBe(0);
		expect(skill.level.get()).toBe(0);
		expect(skill.xp.get()).toBe(xpForLevel(0));
	});

	it('cascades through several levels from a single large grant', () => {
		const skill = makeOrderedSkills().find(s => s.name === SKILL.accuracy) as Accuracy;
		const cost = xpForLevel(0) + xpForLevel(1) + xpForLevel(2);
		const gained = skill.gainXP(cost + 1);
		expect(gained).toBe(3);
		expect(skill.level.get()).toBe(3);
		expect(skill.xp.get()).toBeCloseTo(1, 6);
	});

	it('accumulates xp below the threshold without levelling', () => {
		const skill = makeOrderedSkills().find(s => s.name === SKILL.accuracy) as Accuracy;
		expect(skill.gainXP(40)).toBe(0);
		expect(skill.gainXP(40)).toBe(0);
		expect(skill.level.get()).toBe(0);
		expect(skill.xp.get()).toBeCloseTo(80, 10);
	});
});
