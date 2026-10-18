import { z } from 'zod';

/** Each Speed upgrade unlocks one more step of playback rate, faster and slower. */
export const RATE_STEP = 0.05;
export const MIN_RATE = 0.5;
export const MAX_RATE = 1.5;

const round = (rate: number) => Math.round(rate * 100) / 100;

const unlockedSteps = (speedUpgrades: number) => Math.max(0, speedUpgrades) * RATE_STEP;

/** The fastest rate a character has unlocked: a step per Speed upgrade, up to x1.5. */
export const fastestRate = (speedUpgrades: number): number =>
	round(Math.min(MAX_RATE, 1 + unlockedSteps(speedUpgrades)));

/** The slowest rate a character has unlocked: a step per Speed upgrade, down to x0.5. */
export const slowestRate = (speedUpgrades: number): number =>
	round(Math.max(MIN_RATE, 1 - unlockedSteps(speedUpgrades)));

/** A rate on its step, within what the character has unlocked. */
export const allowedRate = (rate: number, speedUpgrades: number): number => round(Math.min(
	fastestRate(speedUpgrades),
	Math.max(slowestRate(speedUpgrades), Math.round(rate / RATE_STEP) * RATE_STEP),
));

/** The rates a character can pick, slowest first. */
export const rateSteps = (speedUpgrades: number): number[] => {
	const steps: number[] = [];
	const last = fastestRate(speedUpgrades) + 1e-9;
	for (let rate = slowestRate(speedUpgrades); rate <= last; rate += RATE_STEP) {
		steps.push(round(rate));
	}
	return steps;
};

/** What any slowed-down play keeps of its score, like osu!'s HT. Faster plays keep it all. */
export const SLOW_SCORE_MULTIPLIER = 0.3;

export const scoreMultiplier = (rate: number): number => rate < 1 ? SLOW_SCORE_MULTIPLIER : 1;

export const rateSchema = z.number().min(MIN_RATE).max(MAX_RATE);

/** How a rate is written: x1.25, x1.3, x0.5. */
export const rateLabel = (rate: number): string => `x${round(rate)}`;

/** A difficulty's name as shown at a rate: Beginner x1.3. Display only. */
export const versionLabel = (version: string, rate: number): string =>
	rate === 1 ? version : `${version} ${rateLabel(rate)}`;

/** Every rate there is, x1 left out: what a difficulty's stars are kept at. */
export const RATES = rateSteps(Math.round((MAX_RATE - 1) / RATE_STEP)).filter(rate => rate !== 1);

/** A rate as an object key: "1.25". */
export const rateKey = (rate: number): string => round(rate).toFixed(2);
