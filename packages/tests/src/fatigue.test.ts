import {
	describe,
	it,
	expect,
} from 'vitest';
import {
	afterPlay,
	coolingDown,
	fatigueLevel,
	restedFatigue,
	tireSkill,
	warmup,
	type Fatigue,
} from '@oss-idle/shared/fatigue';
import Reading from '@oss-idle/shared/sim/skills/reading';
import Speed from '@oss-idle/shared/sim/skills/speed';
import { xpToLevel } from '@oss-idle/shared/sim/skills/xp';

const MAP = 3;
const GAP = 0.5;

/** Plays 3-minute maps back to back (30s apart), each strained this share of its length. */
const session = (shares: number[], from?: Fatigue) => {
	let fatigue = from;
	let now = from?.at ?? 0;
	for (const share of shares) {
		now += (GAP + MAP) * 60_000;
		fatigue = afterPlay(fatigue, MAP, share * MAP, now);
	}
	return fatigue!;
};
const level = (fatigue: Fatigue) => fatigueLevel(restedFatigue(fatigue, fatigue.at));
const loop = (share: number, hours: number) =>
	Array(Math.round(hours * 60 / (GAP + MAP))).fill(share);

describe('fatigue', () => {
	it('rests through an unranked play as through idle time', () => {
		const tired = session(loop(1, 6));
		const now = tired.at + 10 * 60_000;
		// an unranked play adds no fatigue: the next play sees only its wall-clock rest
		const idle = afterPlay(tired, MAP, MAP, now + MAP * 60_000);
		const unstrained = afterPlay(afterPlay(tired, MAP, 0, now), MAP, MAP, now + MAP * 60_000);
		expect(idle.minutes).toBeCloseTo(unstrained.minutes);
		expect(restedFatigue(tired, now)).toBeLessThan(tired.minutes);
	});

	it('rests a fully strained map off with 2 or 3 easy ones', () => {
		const strained = session([1], session(loop(1, 1)));
		expect(session([0, 0], strained).minutes).toBeGreaterThan(strained.minutes - MAP);
		expect(session([0, 0, 0], strained).minutes).toBeLessThan(strained.minutes - MAP);
	});

	it('kicks in after 5 hours of full strain and floors at 7', () => {
		expect(fatigueLevel(5 * 60)).toBe(0);
		expect(fatigueLevel(5.5 * 60)).toBeGreaterThan(0);
		expect(fatigueLevel(6 * 60)).toBeCloseTo(0.5);
		expect(fatigueLevel(7 * 60)).toBe(1);
		expect(level(session(loop(1, 5)))).toBe(0);
		expect(level(session(loop(1, 10)))).toBe(1);
	});

	it('tires a loop of normal maps much slower', () => {
		expect(level(session(loop(0.4, 6)))).toBeLessThan(0.05);
		expect(level(session(loop(0.25, 24)))).toBe(0);
	});

	it('plays an exhausted physical skill at the level a quarter of its xp reaches', () => {
		const speed = new Speed(80);
		speed.xp.set(500);
		tireSkill(speed, 1);
		expect(speed.level.get()).toBeLessThan(80);
		expect(xpToLevel(speed.level.get()) + speed.xp.get()).toBeCloseTo((xpToLevel(80) + 500) / 4);

		const reading = new Reading(80);
		tireSkill(reading, 1);
		expect(reading.level.get()).toBe(80);
	});

	it('warms up over 1h30 of strain, then cools to half at 5 hours and cold at 6', () => {
		expect(warmup(0)).toBe(0);
		expect(warmup(90)).toBe(1);
		expect(warmup(300)).toBe(0.5);
		expect(warmup(360)).toBe(0);
		expect(warmup(420)).toBe(0);
	});

	it('warms twice as fast and holds the peak 30 minutes longer with 10 stamina gear', () => {
		expect(warmup(45, 10)).toBe(1);
		expect(warmup(120, 10)).toBe(1);
		expect(warmup(121, 10)).toBeLessThan(1);
		expect(coolingDown(120, 10)).toBe(false);
		expect(coolingDown(121, 10)).toBe(true);
		expect(warmup(330, 10)).toBe(0.5);
		expect(warmup(390, 10)).toBe(0);
	});

	it('adds less with each gear tier past the ladder, cold by the strain cap', () => {
		const peak = (gear: number) => [...Array(421).keys()].filter(m => warmup(m, gear) === 1).length;
		const gains = [10, 11, 12, 13].map(g => peak(g + 1) - peak(g));
		expect(gains[0]).toBeGreaterThan(gains[1]);
		expect(gains[1]).toBeGreaterThan(gains[2]);
		for (const gear of [0, 10, 20, 1000]) {
			expect(warmup(7 * 60, gear)).toBe(0);
			expect([...Array(421).keys()].every(m => Number.isFinite(warmup(m, gear)))).toBe(true);
		}
	});

	it('stops counting strain at 7 hours', () => {
		expect(session(loop(1, 24)).minutes).toBe(7 * 60);
	});

	it('plays a cold physical skill at half its xp from level 100, less below', () => {
		const cold = (level: number) => {
			const speed = new Speed(level);
			tireSkill(speed, 0, 0);
			return xpToLevel(speed.level.get()) + speed.xp.get();
		};
		expect(cold(0)).toBe(0);
		expect(cold(50)).toBeCloseTo(xpToLevel(50) * 0.75);
		expect(cold(100)).toBeCloseTo(xpToLevel(100) / 2);
		expect(cold(120)).toBeCloseTo(xpToLevel(120) / 2);

		const warm = new Speed(80);
		tireSkill(warm, 0, 1);
		expect(warm.level.get()).toBe(80);
	});
});
