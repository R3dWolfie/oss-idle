import {
	describe,
	it,
	expect,
} from 'vitest';
import { rollMax } from '@oss-idle/shared/community/roll';

describe('rollMax', () => {
	it('defaults to 100', () => {
		expect(rollMax('!roll')).toBe(100);
		expect(rollMax('!roll abc')).toBe(100);
	});
	it('takes the given max, at least 1', () => {
		expect(rollMax('!roll 6')).toBe(6);
		expect(rollMax('!roll 0')).toBe(1);
		expect(rollMax('!roll -5 please')).toBe(1);
	});
	it('ignores other text', () => {
		expect(rollMax('!rolls')).toBeUndefined();
		expect(rollMax('hi !roll')).toBeUndefined();
	});
});
