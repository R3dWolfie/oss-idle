import * as ppjs from 'rosu-pp-js';
import {
	RATES,
	rateKey,
} from '@oss-idle/shared/rate';
import type { ScoreState } from '@oss-idle/shared/sim/scoring';

/**
 * Performance points for a finished play, computed from the raw `.osu` chart and
 * the simulated `ScoreState`. Mirrors the client's `osu/pp.ts` but uses the node
 * `rosu-pp-js` build (synchronous, no wasm init) and the stored chart text.
 */
export function calculatePP(score: ScoreState, chart: string, rate = 1): number {
	const map = new ppjs.Beatmap(chart);
	return new ppjs.Performance({
		lazer: false,
		clockRate: rate,

		legacyTotalScore: Math.floor(score.score),
		// a pure divine play reads above 1, which is outside rosu-pp's domain
		accuracy: Math.min(1, score.accuracy),
		combo: score.maxCombo,

		nGeki: score.counts.MARVELOUS + score.counts.DIVINE,
		n300: score.counts.PERFECT,
		nKatu: score.counts.GREAT,
		n100: score.counts.GOOD,
		n50: score.counts.BAD,
		misses: score.counts.MISS,
	}).calculate(map).pp;
}

/** The chart's star rating at a playback rate. */
export const starsAt = (chart: string, rate = 1): number =>
	new ppjs.Difficulty({
		lazer: false, clockRate: rate,
	}).calculate(new ppjs.Beatmap(chart)).stars;

/** The chart's stars at every rate but x1, by `rateKey`. */
export const starsAtRates = (chart: string): Record<string, number> =>
	Object.fromEntries(RATES.map(rate => [
		rateKey(rate), Math.round(starsAt(chart, rate) * 1000) / 1000,
	]));
