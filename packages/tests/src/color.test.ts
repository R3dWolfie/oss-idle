import {
	describe,
	it,
	expect,
	beforeAll,
} from 'vitest';
import { i18n } from '@lingui/core';
import {
	colorA,
	colorDim,
	parseColor,
	RGBColorSchema,
	type Color,
} from '@oss-idle/shared/types/color';

const hex = '#63b3ff' as Color;
const rgb = 'rgba(99, 179, 255, 0.5)' as Color;

describe('colours', () => {
	// a failed safeParse translates its error message
	beforeAll(() => i18n.loadAndActivate({
		locale: 'en', messages: {},
	}));

	it('parses hex and rgb() the same, every time', () => {
		expect(parseColor(hex)).toEqual([99, 179, 255, 1]);
		expect(parseColor(hex)).toEqual([99, 179, 255, 1]);
		expect(parseColor(rgb)).toEqual([99, 179, 255, 0.5]);
		expect(parseColor('nope' as Color)).toEqual([0, 0, 0, 1]);
	});

	it('builds valid rgba() strings', () => {
		expect(colorA(colorDim(hex, 1.35), 0.2)).toBe('rgba(133, 241, 255, 0.2)');
		expect(colorDim(colorA(hex, 0.15), 1.35)).toBe('rgba(133, 241, 255, 0.15)');
		for (const a of [0, 1e-7, 0.5, 1, 2]) {
			expect(RGBColorSchema.safeParse(colorA(hex, a)).success).toBe(true);
			expect(RGBColorSchema.safeParse(colorDim(rgb, a * 3)).success).toBe(true);
		}
	});
});
