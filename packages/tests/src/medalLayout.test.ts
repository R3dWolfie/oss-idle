import {
	describe,
	expect,
	it,
} from 'vitest';
import { medalSlots } from '@osu-idle/client/components/medals/medalLayout';

const W = 1216;
const H = 520;

/** medals per row (top to bottom) once `count` have arrived */
const rows = (count: number) => {
	const ys = medalSlots(count, W, H).map(s => Math.round(s.y));
	return [...new Set(ys)].sort((a, b) => a - b).map(y => ys.filter(v => v === y).length);
};

/** row of each medal, by rank of its y */
const rowOf = (count: number) => {
	const ys = medalSlots(count, W, H).map(s => Math.round(s.y));
	const sorted = [...new Set(ys)].sort((a, b) => a - b);
	return ys.map(y => sorted.indexOf(y));
};

describe('medal layout', () => {
	it('opens with centre, pair, triangle, square, 3 over 2', () => {
		expect([1, 2, 3, 4, 5].map(rows)).toEqual([[1], [2], [2, 1], [2, 2], [3, 2]]);
	});

	it('never moves a medal to another row', () => {
		for (let n = 2; n <= 60; n++) {
			expect(rowOf(n).slice(0, n - 1)).toEqual(rowOf(n - 1));
		}
	});

	it('keeps each medal\'s place in its row, left to right', () => {
		for (let n = 1; n <= 60; n++) {
			const slots = medalSlots(n, W, H);
			const row = rowOf(n);
			slots.forEach((slot, i) => {
				const earlier = slots.slice(0, i).filter((_, j) => row[j] === row[i]);
				for (const other of earlier) expect(other.x).toBeLessThan(slot.x);
			});
		}
	});

	it('fits every slot inside the box', () => {
		for (const slot of medalSlots(45, W, H)) {
			expect(slot.x - slot.size / 2).toBeGreaterThanOrEqual(-1e-6);
			expect(slot.x + slot.size / 2).toBeLessThanOrEqual(W + 1e-6);
			expect(slot.y + slot.size / 2).toBeLessThanOrEqual(H + 1e-6);
		}
	});
});
