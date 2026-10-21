import {
	describe,
	expect,
	it,
} from 'vitest';
import {
	batchIds,
	parseScopes,
} from '@oss-idle/shared/oauth';

describe('oauth scopes', () => {
	it('reads space- and plus-separated scopes, once each', () => {
		expect(parseScopes('public identify')).toEqual(['public', 'identify']);
		expect(parseScopes('public+friends.read public')).toEqual(['public', 'friends.read']);
		expect(parseScopes(undefined)).toEqual([]);
	});

	it('refuses a scope we do not have', () => {
		expect(parseScopes('public chat.write')).toBeUndefined();
		expect(parseScopes('delegate')).toBeUndefined();
	});
});

describe('api v2 batch ids', () => {
	it('takes up to 10 positive ids from the query strings', () => {
		expect(batchIds.parse(['1', '42'])).toEqual([1, 42]);
		expect(batchIds.parse([])).toEqual([]);
		expect(batchIds.safeParse(Array.from({ length: 10 }, (_, i) => String(i + 1))).success).toBe(true);
	});

	it('refuses more than 10 ids, or a bad one', () => {
		expect(batchIds.safeParse(Array.from({ length: 11 }, (_, i) => String(i + 1))).success).toBe(false);
		expect(batchIds.safeParse(['0']).success).toBe(false);
		expect(batchIds.safeParse(['abc']).success).toBe(false);
	});
});
