import cubic_bezier from './math/cubic_bezier.js';
import lerp from './math/lerp.js';
import type Skill from './sim/skills/skill.js';
import Memory from './sim/skills/memory.js';
import { makeOrderedSkills } from './sim/skills/factory.js';
import {
	xpGivesLevel,
	xpToLevel,
} from './sim/skills/xp.js';
import { PHYSICAL_SKILLS } from './skills.js';

/** The character's fatigue in strained minutes, as of `at` (ms). */
export type Fatigue = { at: number, minutes: number };

// The character tires a minute per minute its physical skills are strained and
// rests REST_RATE per other minute, played or idle: one fully strained map takes
// 2-3 easy ones to rest. From fresh, nonstop full strain starts to tell after
// 5 hours and reaches the floor at 7. Strain stops counting at STRAIN_CAP: every
// curve below is clamped to end by then.
const REST_RATE = 0.4;
const STRAIN_CAP = 7 * 60;
const ONSET_MINUTES = 5 * 60;
const FULL_MINUTES = 7 * 60;
const FATIGUE_CB = cubic_bezier(.4, 0, .6, 1);
// exhausted, the physical skills play with a quarter of their xp and earn XP_FLOOR
// of their gains: one map on loop averages about x0.1 a day
const PLAY_FLOOR = 0.25;
const XP_FLOOR = 0.05;
// The same strained minutes warm the character up over 1h30, then cool it to half
// at 5 hours and cold at 6. Cold, a physical skill plays with COLD_FLOOR of its xp
// from level COLD_LEVEL, less below; warm-up never touches xp gains. Each stamina
// gear up to GEAR_LADDER warms GEAR_SPEED faster and holds the peak GEAR_HOLD
// longer; each tier past it is worth GEAR_DECAY of the one before.
const WARM_MINUTES = 90;
const GEAR_LADDER = 10;
const GEAR_SPEED = 0.1;
const GEAR_HOLD = 3;
const GEAR_DECAY = 0.7;
const HALF_WARM_MINUTES = 5 * 60;
const COLD_MINUTES = 6 * 60;
const COLD_FLOOR = 0.5;
const COLD_LEVEL = 100;

/** The fatigue left at `now`, rested since the last play. */
export const restedFatigue = (fatigue: Fatigue | undefined, now: number): number =>
	Math.max(0, (fatigue?.minutes ?? 0) - REST_RATE * Math.max(0, now - (fatigue?.at ?? now)) / 60_000);

/** How far `minutes` are from `from` to `to`, eased: 0 before, 1 from `to` on. */
const ease = (minutes: number, from: number, to: number): number =>
	to > from ? FATIGUE_CB((minutes - from) / (to - from)) : Number(minutes >= to);

/** How tired `minutes` of fatigue leave the character: 0 rested, 1 exhausted. */
export const fatigueLevel = (minutes: number): number => {
	const full = Math.min(FULL_MINUTES, STRAIN_CAP);
	return ease(minutes, Math.min(ONSET_MINUTES, full), full);
};

/** The stamina gear warm-up counts with: the ladder's, then tiers worth less and less. */
const warmGear = (upgrades: number): number => {
	const tiers = Math.max(0, upgrades - GEAR_LADDER);
	return Math.min(upgrades, GEAR_LADDER) + (1 - GEAR_DECAY ** tiers) / (1 - GEAR_DECAY);
};

/** The strained minutes where warm-up peaks, starts cooling, is half and is cold, with `upgrades` stamina gear. */
export const warmupCurve = (upgrades = 0) => {
	const gear = warmGear(upgrades);
	const cold = Math.min(COLD_MINUTES + gear * GEAR_HOLD, STRAIN_CAP);
	const half = Math.min(HALF_WARM_MINUTES + gear * GEAR_HOLD, cold);
	const peakEnd = Math.min(WARM_MINUTES + gear * GEAR_HOLD, half);
	const warm = Math.min(WARM_MINUTES / (1 + gear * GEAR_SPEED), peakEnd);
	return {
		warm, peakEnd, half, cold,
	};
};

/** How warmed up `minutes` of fatigue leave a character with `upgrades` stamina gear: 0 cold, 1 warm. */
export const warmup = (minutes: number, upgrades = 0): number => {
	const {
		warm, peakEnd, half, cold,
	} = warmupCurve(upgrades);
	if (minutes < warm) return ease(minutes, 0, warm);
	if (minutes < half) return lerp(1, 0.5, ease(minutes, peakEnd, half));
	return lerp(0.5, 0, ease(minutes, half, cold));
};

/** Whether `minutes` of fatigue are past warm-up's peak, cooling it down. */
export const coolingDown = (minutes: number, upgrades = 0): boolean =>
	minutes > warmupCurve(upgrades).peakEnd;

/** The share of the physical skills' xp gains a play at fatigue `level` keeps. */
export const fatigueXp = (level: number): number => lerp(1, XP_FLOOR, level);

/** The fatigue after a play that ended `now`, `minutes` long, `strained` of them. */
export const afterPlay = (
	before: Fatigue | undefined,
	minutes: number,
	strained: number,
	now: number,
): Fatigue => {
	const rested = restedFatigue(before, now - minutes * 60_000);
	const next = rested + strained - REST_RATE * (minutes - strained);
	return {
		at: now, minutes: Math.min(STRAIN_CAP, Math.max(0, next)),
	};
};

/** A physical skill at fatigue `fatigue` and warm-up `warm` plays at the level part of the xp behind its level reaches. */
export const tireSkill = (skill: Skill, fatigue: number, warm = 1) => {
	if (!PHYSICAL_SKILLS.includes(skill.name)) return;
	const cold = lerp(1, COLD_FLOOR, Math.min(1, skill.level.get() / COLD_LEVEL));
	const kept = lerp(1, PLAY_FLOOR, fatigue) * lerp(cold, 1, warm);
	if (kept >= 1) return;
	const { level, xp } = xpGivesLevel((xpToLevel(skill.level.get()) + skill.xp.get()) * kept);
	skill.level.set(level);
	skill.xp.set(xp);
};

/** A tired copy of `skills`, leaving the originals as they are. */
export const tiredSkills = (skills: Skill[], fatigue: number, warm: number): Skill[] =>
	makeOrderedSkills().map(copy => {
		const skill = skills.find(s => s.name === copy.name)!;
		copy.apply(skill.state());
		if (copy instanceof Memory && skill instanceof Memory) {
			copy.timesPlayed.set(skill.timesPlayed.get());
		}
		tireSkill(copy, fatigue, warm);
		return copy;
	});
