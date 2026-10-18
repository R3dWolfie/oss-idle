import {
	describe,
	expect,
	it,
} from 'vitest';
import { parseScopes } from '@osu-idle/shared/oauth';

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
