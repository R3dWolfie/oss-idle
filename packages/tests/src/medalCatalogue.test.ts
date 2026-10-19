import {
	expect,
	it,
} from 'vitest';
import { i18n } from '@lingui/core';
import {
	MEDAL_LINES,
	MEDALS,
} from '@oss-idle/shared/achievements/catalogue';
import { GLYPHS } from '@oss-idle/shared/achievements/glyphs';
import {
	medalDescription,
	medalName,
} from '@oss-idle/shared/display/medals';

i18n.loadAndActivate({
	locale: 'en', messages: {},
});

it('gives every medal a unique id, a glyph, a name and a description', () => {
	expect(new Set(MEDALS.map(m => m.id)).size).toBe(MEDALS.length);
	for (const medal of MEDALS) {
		expect(GLYPHS[medal.glyph]).toBeTruthy();
		expect(medalName(medal.id)).toBeTruthy();
		expect(medalDescription(medal.id)).toBeTruthy();
	}
});

it('lays every medal out on exactly one profile line, in its own category', () => {
	const placed = Object.entries(MEDAL_LINES).flatMap(([category, lines]) =>
		lines.flat().map(id => ({
			id, category,
		})));
	expect(placed.map(p => p.id).sort()).toEqual(MEDALS.map(m => m.id).sort());
	for (const { id, category } of placed) {
		expect(MEDALS.find(m => m.id === id)?.category).toBe(category);
	}
});
