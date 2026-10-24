import {
	describe,
	expect,
	it,
} from 'vitest';
import {
	decodeIni,
	parseSkinIni,
} from '@oss-idle/shared/osuSkin/ini';
import {
	columnType,
	maniaConfig,
	NOTE_BODY,
} from '@oss-idle/shared/osuSkin/mania';
import { parseIdleIni } from '@oss-idle/shared/osuSkin/idleIni';
import {
	findFrames,
	findImage,
	findSound,
	normalizePath,
} from '@oss-idle/shared/osuSkin/files';

const INI = `[General]
#a note in French: stable skips it
Name: My Skin 16:9     //the name keeps its colon
Author: Someone
Version: 2.5
AnimationFramerate: 30
HitCircleOverlayAboveNumer: 0

[Colours]
Combo1: 255,0,0
Combo2: 0, 255, 0
SliderBorder: 1,2,3,4
Junk: not a colour
MyCustom: 9,9,9

[Fonts]
ScorePrefix: "Fonts\\\\Score\\score"
ComboOverlap: 3

[CatchTheBeat]
HyperDash: 255,0,0,128

[Mania]
ColumnWidth: 40,x,40,40
Keys: 4
HitPosition: 600
NoteImage0: Notes\\left
Hit300g: mania\\hits\\marv
NoteBodyStyle2: 2
Colour1: 10,20,30,200
KeyFlipWhenUpsideDown: 0
KeyFlipWhenUpsideDown1D: 1
Keys: 7
ColumnStart: 200

[Mania]
Keys: 4
ColumnWidth: 99
`;

describe('skin.ini', () => {
	const ini = parseSkinIni(INI);

	it('reads every section the way stable does', () => {
		expect(ini.general).toMatchObject({
			name: 'My Skin 16:9', author: 'Someone', version: 2.5, animationFramerate: 30,
			hitCircleOverlayAboveNumber: false,
		});
		expect(ini.colours.combo).toEqual([[255, 0, 0, 255], [0, 255, 0, 255]]);
		// [Colours] takes no alpha; an unknown colour is kept, a broken one dropped
		expect(ini.colours.sliderBorder).toEqual([1, 2, 3, 255]);
		expect(ini.colours.extra).toEqual({ MyCustom: [9, 9, 9, 255] });
		expect(ini.fonts).toMatchObject({
			scorePrefix: 'Fonts\\Score\\score', comboOverlap: 3,
		});
		expect(ini.catch.hyperDash).toEqual([255, 0, 0, 128]);
	});

	it('keeps one block per key count, the first, commands before Keys: included', () => {
		expect(ini.mania.map(m => m.keys)).toEqual([4, 7]);
		expect(ini.mania[0].values.ColumnWidth).toBe('40,x,40,40');
		expect(ini.mania[1].values).toEqual({ ColumnStart: '200' });
	});

	it('resolves a key count with stable defaults', () => {
		const four = maniaConfig(ini, 4);
		// a broken list entry reads as 0, like stable
		expect(four.columnWidth).toEqual([40, 0, 40, 40]);
		expect(four.columnLineWidth).toEqual([2, 2, 2, 2, 2]);
		expect(four.hitPosition).toBe(480);
		expect(four.images).toEqual({
			NoteImage0: 'Notes\\left', Hit300g: 'mania\\hits\\marv',
		});
		expect(four.noteBodyStyle).toEqual([
			NOTE_BODY.REPEAT_BOTTOM, NOTE_BODY.REPEAT_BOTTOM, NOTE_BODY.REPEAT_TOP, NOTE_BODY.REPEAT_BOTTOM,
		]);
		expect(four.colours.column[0]).toEqual([10, 20, 30, 200]);
		expect(four.keyFlip[1]).toEqual({
			up: false, down: true,
		});

		const five = maniaConfig(ini, 5);
		expect(five.columnWidth).toEqual([30, 30, 30, 30, 30]);
		expect(five.columnStart).toBe(136);
		const old = parseSkinIni('[General]\nVersion: 1.0');
		expect(maniaConfig(old, 4).noteBodyStyle[0]).toBe(NOTE_BODY.STRETCH);
	});

	it('picks a column default image from the edges in, S in the middle', () => {
		const types = (keys: number) =>
			Array.from({ length: keys }, (_, c) => columnType(keys, c)).join('');
		expect(types(4)).toBe('1221');
		expect(types(6)).toBe('121121');
		expect(types(7)).toBe('121S121');
	});

	it('decodes a UTF-16 skin.ini', () => {
		const text = 'Name: é';
		const bytes = new Uint8Array(2 + text.length * 2);
		bytes.set([0xff, 0xfe]);
		for (let i = 0; i < text.length; i++) bytes[2 + i * 2] = text.charCodeAt(i);
		expect(decodeIni(bytes)).toBe(text);
	});
});

describe('skin files', () => {
	const paths = new Set([
		'mania-note1.png', 'mania-note1@2x.png', 'notes/left.jpg',
		'lightingn-0.png', 'lightingn-1@2x.png', 'normal-hitclap.ogg',
	]);
	const index = { has: (p: string) => paths.has(p) };

	it('looks names up case-blind, either separator, @2x first', () => {
		expect(normalizePath('Notes\\Left.PNG')).toBe('notes/left.png');
		expect(findImage(index, 'Mania-Note1')).toEqual({
			path: 'mania-note1@2x.png', density: 2,
		});
		expect(findImage(index, 'Notes\\left')).toEqual({
			path: 'notes/left.jpg', density: 1,
		});
		expect(findImage(index, 'notes/left@2x.jpg')?.path).toBe('notes/left.jpg');
	});

	it('finds animation frames, each at its own resolution', () => {
		expect(findFrames(index, 'lightingN').map(f => f.path))
			.toEqual(['lightingn-0.png', 'lightingn-1@2x.png']);
		expect(findFrames(index, 'mania-note1')).toHaveLength(1);
		expect(findFrames(index, 'mania-note2')).toEqual([]);
		expect(findSound(index, 'normal-hitclap')).toBe('normal-hitclap.ogg');
	});
});

describe('idle.ini', () => {
	it('reads judgement colours and names, and per key count stage settings', () => {
		const ini = parseIdleIni([
			'[Judgements]', 'Divine: 1,2,3', 'Miss: 255,0,0,128', 'Nope: 1,1,1', 'Great: broken',
			'[JudgementNames]', 'Divine: GODLIKE',
			'[Mania]', 'StageCentre: 1', 'Keys: 4', 'StageCentre: 1', 'Keys: 7', 'StageCentre: 0',
			'[Mania]', 'Keys: 4', 'StageCentre: 0',
		].join('\n'));
		expect(ini.judgements).toEqual({
			DIVINE: [1, 2, 3, 255], MISS: [255, 0, 0, 128],
		});
		expect(ini.judgementNames).toEqual({ DIVINE: 'GODLIKE' });
		expect(ini.mania).toEqual([{
			keys: 4, stageCentre: true,
		}, {
			keys: 7, stageCentre: false,
		}]);
	});
});
