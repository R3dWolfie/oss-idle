/**
 * osu!stable's skin.ini, every section and every command the game knows of (osu!, taiko,
 * catch and mania alike), read the way stable reads it. Commands we have no use for yet are
 * kept typed all the same, and anything unknown lands in `extra`, so a stored skin never
 * needs reading again when a feature starts using more of it.
 */

/** r, g, b, a - each 0..255 */
export type Rgba = [number, number, number, number];

export type SkinVersion = number | 'latest';

export type GeneralSection = {
	name?: string,
	author?: string,
	version: SkinVersion,
	animationFramerate?: number,
	allowSliderBallTint?: boolean,
	comboBurstRandom?: boolean,
	cursorCentre?: boolean,
	cursorExpand?: boolean,
	cursorRotate?: boolean,
	cursorTrailRotate?: boolean,
	customComboBurstSounds?: number[],
	hitCircleOverlayAboveNumber?: boolean,
	layeredHitSounds?: boolean,
	sliderBallFlip?: boolean,
	sliderBallFrames?: number,
	sliderStyle?: number,
	spinnerFadePlayfield?: boolean,
	spinnerFrequencyModulate?: boolean,
	spinnerNoBlink?: boolean,
	extra: Record<string, string>,
};

export type ColoursSection = {
	/** Combo1..Combo8 in file order */
	combo: Rgba[],
	inputOverlayText?: Rgba,
	menuGlow?: Rgba,
	sliderBall?: Rgba,
	sliderBorder?: Rgba,
	sliderTrackOverride?: Rgba,
	songSelectActiveText?: Rgba,
	songSelectInactiveText?: Rgba,
	spinnerBackground?: Rgba,
	starBreakAdditive?: Rgba,
	extra: Record<string, Rgba>,
};

export type FontsSection = {
	hitCirclePrefix?: string,
	hitCircleOverlap?: number,
	scorePrefix?: string,
	scoreOverlap?: number,
	comboPrefix?: string,
	comboOverlap?: number,
	extra: Record<string, string>,
};

export type CatchSection = {
	hyperDash?: Rgba,
	hyperDashFruit?: Rgba,
	hyperDashAfterImage?: Rgba,
	extra: Record<string, Rgba>,
};

/** One `[Mania]` block as written: every command raw, for {@link maniaConfig} to resolve. */
export type ManiaSection = {
	keys: number,
	values: Record<string, string>,
};

export type SkinIni = {
	general: GeneralSection,
	colours: ColoursSection,
	fonts: FontsSection,
	catch: CatchSection,
	mania: ManiaSection[],
};

/** A skin with no skin.ini: stable treats it as the latest version. */
export const emptyIni = (version: SkinVersion = 'latest'): SkinIni => ({
	general: {
		version, extra: {},
	},
	colours: {
		combo: [], extra: {},
	},
	fonts: { extra: {} },
	catch: { extra: {} },
	mania: [],
});

/** The text of a skin.ini, by its byte order mark (stable's reader), else UTF-8. */
export const decodeIni = (bytes: Uint8Array): string => {
	const body = bytes.subarray(2);
	if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(body);
	if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(body);
	return new TextDecoder('utf-8').decode(bytes).replace(/^﻿/, '');
};

/** `1` (or `true`) is on, anything else off. */
export const iniBool = (v: string): boolean => v === '1' || v.toLowerCase() === 'true';

/** A plain number, or undefined when the value is not one. */
export const iniNumber = (v: string): number | undefined => {
	if (!v.trim()) return undefined;
	const n = Number(v);
	return Number.isFinite(n) ? n : undefined;
};

/** A comma list of numbers; entries that are not numbers read as 0, like stable. */
export const iniNumbers = (v: string): number[] =>
	v.split(',').map(s => iniNumber(s.trim()) ?? 0);

/** `r,g,b` or `r,g,b,a` with 0..255 parts; alpha only where the command takes it. */
export const iniColour = (v: string, allowAlpha = true): Rgba | undefined => {
	const parts = v.split(',').map(s => s.trim());
	if (parts.length !== 3 && parts.length !== 4) return undefined;
	const n = parts.map(Number);
	if (n.some(x => !Number.isInteger(x) || x < 0 || x > 255)) return undefined;
	return [n[0], n[1], n[2], allowAlpha && n.length === 4 ? n[3] : 255];
};

const GENERAL_BOOLS = {
	AllowSliderBallTint: 'allowSliderBallTint',
	ComboBurstRandom: 'comboBurstRandom',
	CursorCentre: 'cursorCentre',
	CursorExpand: 'cursorExpand',
	CursorRotate: 'cursorRotate',
	CursorTrailRotate: 'cursorTrailRotate',
	HitCircleOverlayAboveNumber: 'hitCircleOverlayAboveNumber',
	// stable still reads the old misspelling
	HitCircleOverlayAboveNumer: 'hitCircleOverlayAboveNumber',
	LayeredHitSounds: 'layeredHitSounds',
	SliderBallFlip: 'sliderBallFlip',
	SpinnerFadePlayfield: 'spinnerFadePlayfield',
	SpinnerFrequencyModulate: 'spinnerFrequencyModulate',
	SpinnerNoBlink: 'spinnerNoBlink',
} as const satisfies Record<string, keyof GeneralSection>;

const GENERAL_NUMBERS = {
	AnimationFramerate: 'animationFramerate',
	SliderBallFrames: 'sliderBallFrames',
	SliderStyle: 'sliderStyle',
} as const satisfies Record<string, keyof GeneralSection>;

const COLOURS = {
	InputOverlayText: 'inputOverlayText',
	MenuGlow: 'menuGlow',
	SliderBall: 'sliderBall',
	SliderBorder: 'sliderBorder',
	SliderTrackOverride: 'sliderTrackOverride',
	SongSelectActiveText: 'songSelectActiveText',
	SongSelectInactiveText: 'songSelectInactiveText',
	SpinnerBackground: 'spinnerBackground',
	StarBreakAdditive: 'starBreakAdditive',
} as const satisfies Record<string, keyof ColoursSection>;

const CATCH = {
	HyperDash: 'hyperDash',
	HyperDashFruit: 'hyperDashFruit',
	HyperDashAfterImage: 'hyperDashAfterImage',
} as const satisfies Record<string, keyof CatchSection>;

const FONT_PREFIXES = {
	HitCirclePrefix: 'hitCirclePrefix',
	ScorePrefix: 'scorePrefix',
	ComboPrefix: 'comboPrefix',
} as const satisfies Record<string, keyof FontsSection>;

const FONT_OVERLAPS = {
	HitCircleOverlap: 'hitCircleOverlap',
	ScoreOverlap: 'scoreOverlap',
	ComboOverlap: 'comboOverlap',
} as const satisfies Record<string, keyof FontsSection>;

const has = <T extends object>(map: T, key: string): key is Extract<keyof T, string> =>
	Object.prototype.hasOwnProperty.call(map, key);

/** stable's own path cleanup: quotes off, a doubled backslash read as one */
const cleanPath = (v: string) => v.replace(/^"|"$/g, '').replace(/\\\\/g, '\\');

const readGeneral = (out: GeneralSection, key: string, value: string) => {
	if (key === 'Name') out.name = value;
	else if (key === 'Author') out.author = value;
	else if (key === 'Version') {
		const n = iniNumber(value);
		if (value === 'latest') out.version = 'latest';
		else if (n !== undefined) out.version = n;
	} else if (key === 'CustomComboBurstSounds') {
		out.customComboBurstSounds = value.split(',')
			.map(s => iniNumber(s.trim()))
			.filter(n => n !== undefined);
	} else if (has(GENERAL_BOOLS, key)) out[GENERAL_BOOLS[key]] = iniBool(value);
	else if (has(GENERAL_NUMBERS, key)) {
		const n = iniNumber(value);
		if (n !== undefined) out[GENERAL_NUMBERS[key]] = n;
	} else out.extra[key] = value;
};

const readColours = (out: ColoursSection, key: string, value: string) => {
	const colour = iniColour(value, false);
	if (!colour) return;
	const combo = /^Combo([1-8])$/.exec(key);
	if (combo) out.combo.push(colour);
	else if (has(COLOURS, key)) out[COLOURS[key]] = colour;
	else out.extra[key] = colour;
};

const readFonts = (out: FontsSection, key: string, value: string) => {
	if (has(FONT_PREFIXES, key)) out[FONT_PREFIXES[key]] = cleanPath(value);
	else if (has(FONT_OVERLAPS, key)) {
		const n = iniNumber(value);
		if (n !== undefined) out[FONT_OVERLAPS[key]] = n;
	} else out.extra[key] = value;
};

const readCatch = (out: CatchSection, key: string, value: string) => {
	const colour = iniColour(value, true);
	if (!colour) return;
	if (has(CATCH, key)) out[CATCH[key]] = colour;
	else out.extra[key] = colour;
};

type Section = 'General' | 'Colours' | 'Fonts' | 'CatchTheBeat' | 'Mania' | 'Other';

const SECTIONS = new Set<string>(['General', 'Colours', 'Fonts', 'CatchTheBeat', 'Mania']);

/** A mania block: its commands may come before `Keys:`, and a second block for a key count
 *  already seen is dropped. */
type ManiaBlock = { keys?: number, values: Record<string, string> };

const closeMania = (ini: SkinIni, block: ManiaBlock | undefined) => {
	if (!block?.keys || ini.mania.some(m => m.keys === block.keys)) return;
	ini.mania.push({
		keys: block.keys, values: block.values,
	});
};

type Reader = { ini: SkinIni, section: Section, mania?: ManiaBlock };

const COMMENT_STARTS = ['//', '#', ';'];

/** A line without its comment, or undefined when nothing is left of it. */
const meaningful = (raw: string): string | undefined => {
	const trimmed = raw.trim();
	if (!trimmed || COMMENT_STARTS.some(c => trimmed.startsWith(c))) return undefined;
	const comment = raw.indexOf('//');
	return (comment > 0 ? raw.slice(0, comment) : raw).trim() || undefined;
};

const enterSection = (r: Reader, name: string) => {
	if (r.section === 'Mania') closeMania(r.ini, r.mania);
	r.section = SECTIONS.has(name) ? name as Section : 'Other';
	r.mania = r.section === 'Mania' ? { values: {} } : undefined;
};

const readMania = (r: Reader, key: string, value: string) => {
	const block = r.mania!;
	if (key !== 'Keys') {
		block.values[key] = value;
		return;
	}
	const keys = iniNumber(value);
	if (keys === undefined || !Number.isInteger(keys) || keys <= 0) return;
	// a second Keys: in one block starts the next key count
	if (block.keys) {
		closeMania(r.ini, block);
		r.mania = {
			keys, values: {}, 
		};
	} else block.keys = keys;
};

const readPair = (r: Reader, key: string, value: string) => {
	switch (r.section) {
		case 'General': return readGeneral(r.ini.general, key, value);
		case 'Colours': return readColours(r.ini.colours, key, value);
		case 'Fonts': return readFonts(r.ini.fonts, key, value);
		case 'CatchTheBeat': return readCatch(r.ini.catch, key, value);
		case 'Mania': return readMania(r, key, value);
	}
};

export type IniLine = { section: string } | { key: string, value: string };

/** An ini file's sections and `key: value` pairs in order, comments left out. */
export const iniLines = (text: string): IniLine[] => {
	const lines: IniLine[] = [];
	for (const raw of text.split(/\r?\n|\r/)) {
		const line = meaningful(raw);
		if (!line) continue;
		if (line.startsWith('[') && line.endsWith(']')) {
			lines.push({ section: line.slice(1, -1) });
			continue;
		}
		const colon = line.indexOf(':');
		const key = (colon < 0 ? line : line.slice(0, colon)).trim();
		if (key) lines.push({
			key, value: colon < 0 ? '' : line.slice(colon + 1).trim(),
		});
	}
	return lines;
};

/** Read a skin.ini's text. Never throws: a line stable would skip is skipped. */
export const parseSkinIni = (text: string): SkinIni => {
	// a skin.ini without Version is the original 1.0 skin
	const r: Reader = {
		ini: emptyIni(1), section: 'General',
	};
	for (const line of iniLines(text)) {
		if ('section' in line) enterSection(r, line.section);
		else readPair(r, line.key, line.value);
	}
	enterSection(r, '');
	return r.ini;
};

/** The skin version as a number, `latest` read as the newest stable knows. */
export const versionNumber = (version: SkinVersion): number => version === 'latest' ? 2.7 : version;
