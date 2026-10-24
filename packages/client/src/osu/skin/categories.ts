import {
	fileType,
	normalizePath,
} from '@oss-idle/shared/osuSkin/files';
import type { SkinIni } from '@oss-idle/shared/osuSkin/ini';

export const SKIN_CATEGORIES = [
	'mania', 'osu', 'taiko', 'catch', 'interface', 'sounds', 'other',
] as const;
export type SkinCategory = typeof SKIN_CATEGORIES[number];

const AUDIO = new Set(['wav', 'ogg', 'mp3']);
const IMAGES = new Set(['png', 'jpg', 'jpeg']);

const OSU = new RegExp(`^(${[
	'hitcircle', 'approachcircle', 'slider', 'reversearrow', 'spinner-', 'followpoint', 'default-\\d',
	'hit(0|50|100|300)[kg]?(-\\d+)?$', 'cursor', 'particle', 'lighting$', 'comboburst(-\\d+)?$',
	'play-warningarrow', 'arrow-', 'inputoverlay',
].join('|')})`);
const TAIKO = /^(taiko|pippidon)/;
const CATCH = /^(fruit-|comboburst-fruits)/;
const MANIA = /^(mania-|lighting[nl]|comboburst-mania)/;

/** The element's own name: no folder, extension, @2x or animation frame number. */
const elementName = (path: string) => normalizePath(path).split('/').pop()!
	.replace(/\.[^.]+$/, '').replace(/@2x$/, '');

/** Every file a skin.ini's [Mania] blocks point at, normalized and without extension. */
export const maniaPaths = (ini: SkinIni): Set<string> => new Set(ini.mania.flatMap(m =>
	Object.entries(m.values)
		.filter(([key]) => /^(NoteImage|KeyImage|Hit|Stage|Lighting|WarningArrow)/.test(key))
		.map(([, value]) => normalizePath(value.replace(/^"|"$/g, '')).replace(/@2x$/, ''))));

/** Which part of the game a skin file is for, by stable's names. */
export const skinCategory = (path: string, mania: Set<string>): SkinCategory => {
	const type = fileType(path);
	if (AUDIO.has(type)) return 'sounds';
	if (!IMAGES.has(type)) return 'other';
	const stem = normalizePath(path).replace(/\.[^.]+$/, '').replace(/@2x$/, '');
	if (mania.has(stem) || mania.has(stem.replace(/-\d+$/, ''))) return 'mania';
	const name = elementName(path);
	if (MANIA.test(name)) return 'mania';
	if (TAIKO.test(name)) return 'taiko';
	if (CATCH.test(name)) return 'catch';
	if (OSU.test(name)) return 'osu';
	return 'interface';
};
