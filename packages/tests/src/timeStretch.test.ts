import {
	describe,
	expect,
	it,
} from 'vitest';
import { timeStretch } from '../../client/src/audio/timeStretch';

const RATE = 44100;

const tone = (hz: number, seconds: number) => {
	const out = new Float32Array(RATE * seconds);
	for (let i = 0; i < out.length; i++) out[i] = Math.sin(2 * Math.PI * hz * i / RATE);
	return out;
};

/** Frequency from upward zero crossings. */
const pitchOf = (samples: Float32Array) => {
	let crossings = 0;
	for (let i = 1; i < samples.length; i++) if (samples[i - 1] < 0 && samples[i] >= 0) crossings++;
	return crossings / (samples.length / RATE);
};

describe('timeStretch', () => {
	for (const rate of [0.5, 1.25, 1.5]) {
		it(`plays x${rate} at the same pitch`, () => {
			const [out] = timeStretch([tone(440, 4)], RATE, rate);
			expect(out.length / RATE).toBeCloseTo(4 / rate, 0);
			expect(pitchOf(out)).toBeGreaterThan(435);
			expect(pitchOf(out)).toBeLessThan(445);
		});
	}

	for (const rate of [0.5, 0.75, 1.5]) {
		it(`keeps x${rate} on time, so hitsounds land with the music`, () => {
			// clicks over a quiet tone: pure silence leaves nothing to line up on
			const input = tone(220, 20).map(v => v * 0.05);
			const clicks: number[] = [];
			for (let ms = 1000; ms < 19000; ms += 500) {
				const at = Math.round(ms * RATE / 1000);
				for (let k = 0; k < 40; k++) input[at + k] = 1 - k / 40;
				clicks.push(ms / rate);
			}
			const [out] = timeStretch([input], RATE, rate);
			const errors = clicks.flatMap((ms) => {
				const from = Math.round((ms - 100) * RATE / 1000);
				const window = Array.from(out.subarray(from, from + RATE / 5), Math.abs);
				const peak = Math.max(...window);
				return peak > 0.5 ? [(from + window.indexOf(peak)) * 1000 / RATE - ms] : [];
			});
			const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
			expect(Math.abs(mean)).toBeLessThan(10);
		});
	}

	it('keeps channels apart', () => {
		const [left, right] = timeStretch([tone(440, 2), tone(660, 2)], RATE, 1.5);
		expect(pitchOf(left)).toBeCloseTo(440, -1);
		expect(pitchOf(right)).toBeCloseTo(660, -1);
	});
});
