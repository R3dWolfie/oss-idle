import {
	describe,
	expect,
	it,
} from 'vitest';

import {
	mentionPattern,
	mentionQuery,
	namesStarting,
} from '@oss-idle/client/components/community/chat/mentionQuery';

describe('mentionQuery', () => {
	it('opens on a bare @, at the start or after a space', () => {
		expect(mentionQuery('@')).toBe('');
		expect(mentionQuery('gg @')).toBe('');
		expect(mentionQuery('gg @ad')).toBe('ad');
	});

	it('stays shut inside a word, after a space, or for an e-mail', () => {
		expect(mentionQuery('mail@ad')).toBeUndefined();
		expect(mentionQuery('@adri ')).toBeUndefined();
		expect(mentionQuery('hi there')).toBeUndefined();
	});
});

describe('namesStarting', () => {
	const names = ['Adri', 'adrien', 'Badri', 'R3D', 'R3DWolfie', 'Rai'];

	it('keeps the names the prefix starts, any case', () => {
		expect(namesStarting(names, 'ADR')).toEqual(['Adri', 'adrien']);
		expect(namesStarting(names, 'r3')).toEqual(['R3D', 'R3DWolfie']);
	});

	it('keeps the order it was given (who is talking first), everyone for an empty prefix', () => {
		expect(namesStarting(['Rai', 'Adri', 'R3D'], 'r')).toEqual(['Rai', 'R3D']);
		expect(namesStarting(names, '')).toEqual(names);
	});
});

describe('mentionPattern', () => {
	it('finds @Name as a whole word, any case, the longest name first', () => {
		const pattern = mentionPattern(['R3D', 'R3DWolfie', 'Rai'])!;
		expect('hey @r3dwolfie and @Rai, not @R3Dx'.match(pattern)).toEqual(['@r3dwolfie', '@Rai']);
	});

	it('takes names with spaces and brackets as they are', () => {
		const pattern = mentionPattern(['JEREN[MONKEY]', 'Picklesito97x :3'])!;
		expect('@JEREN[MONKEY] gg @Picklesito97x :3'.match(pattern))
			.toEqual(['@JEREN[MONKEY]', '@Picklesito97x :3']);
	});

	it('is nothing without names', () => {
		expect(mentionPattern([])).toBeUndefined();
	});
});
