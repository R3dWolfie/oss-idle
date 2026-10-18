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

	it('keeps channels apart', () => {
		const [left, right] = timeStretch([tone(440, 2), tone(660, 2)], RATE, 1.5);
		expect(pitchOf(left)).toBeCloseTo(440, -1);
		expect(pitchOf(right)).toBeCloseTo(660, -1);
	});
});
