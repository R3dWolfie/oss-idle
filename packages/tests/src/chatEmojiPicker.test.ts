import {
	describe,
	expect,
	it,
} from 'vitest';

import { frequentIds } from '@oss-idle/client/components/community/chat/emojiFrequent';
import {
	EMOJI_GROUPS,
	groupOf,
} from '@oss-idle/client/components/community/chat/emojiGroups';

describe('emoji groups', () => {
	it('puts each name in one section only', () => {
		const names = EMOJI_GROUPS.flatMap(g => [...g.names]);
		expect(new Set(names).size).toBe(names.length);
	});

	it('knows the common ones, and nothing it was not told', () => {
		expect(groupOf('sob')).toBe('people');
		expect(groupOf('fire')).toBe('nature');
		expect(groupOf('pizza')).toBe('food');
		expect(groupOf('a_supporters_own')).toBeUndefined();
	});

	it('picks each tab icon from its own section', () => {
		for (const g of EMOJI_GROUPS) expect(g.names as readonly string[]).toContain(g.icon);
	});
});

describe('frequently used', () => {
	it('lists the most used first, sixteen at most', () => {
		expect(frequentIds({
			3: 1, 7: 5, 9: 2,
		})).toEqual([7, 9, 3]);
		const many = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [String(i + 1), i + 1]));
		expect(frequentIds(many)).toHaveLength(16);
	});
});
