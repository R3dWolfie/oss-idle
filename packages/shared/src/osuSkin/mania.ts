import {
	iniBool,
	iniColour,
	iniNumber,
	iniNumbers,
	versionNumber,
	type Rgba,
	type SkinIni,
} from './ini.js';

/** How a long note body fills its length. */
export const NOTE_BODY = {
	STRETCH: 0,
	REPEAT_TOP: 2,
	REPEAT_BOTTOM: 3,
	REPEAT_TOP_AND_BOTTOM: 4,
} as const;
export type NoteBodyStyle = typeof NOTE_BODY[keyof typeof NOTE_BODY];

/**
 * A key count's `[Mania]` settings with stable's defaults filled in. Positions and sizes are
 * in stable's 480-high space (y from the top), except `columnLineWidth`, which stable never
 * scaled. Image commands stay raw in `images` (`NoteImage0H`, `KeyImage2D`, `Hit300g`, ...).
 */
export type ManiaConfig = {
	keys: number,
	columnStart: number,
	columnRight: number,
	columnWidth: number[],
	/** between column i and i + 1 */
	columnSpacing: number[],
	/** keys + 1 lines, the first left of column 0 */
	columnLineWidth: number[],
	barlineHeight: number,
	/** 0 where unset */
	lightingNWidth: number[],
	lightingLWidth: number[],
	/** 0 when unset: the narrowest column then sets every note's height */
	widthForNoteHeightScale: number,
	hitPosition: number,
	lightPosition: number,
	scorePosition: number,
	comboPosition: number,
	judgementLine: boolean,
	lightFramePerSecond: number,
	specialStyle: number,
	comboBurstStyle: number,
	splitStages?: boolean,
	stageSeparation: number,
	separateScore: boolean,
	keysUnderNotes: boolean,
	upsideDown: boolean,
	noteBodyStyle: NoteBodyStyle[],
	/** per column: does the key (up, down) flip with an upside-down stage */
	keyFlip: { up: boolean, down: boolean }[],
	/** per column: does the note / head / body / tail flip with an upside-down stage */
	noteFlip: { note: boolean, head: boolean, body: boolean, tail: boolean }[],
	colours: {
		column: Rgba[],
		light: Rgba[],
		columnLine: Rgba,
		barline: Rgba,
		judgementLine: Rgba,
		keyWarning: Rgba,
		hold: Rgba,
		break: Rgba,
	},
	images: Record<string, string>,
};

const WHITE: Rgba = [255, 255, 255, 255];

const fill = (n: number, v: number) => new Array<number>(Math.max(0, n)).fill(v);

const overlay = (target: number[], values: number[]) => {
	for (let i = 0; i < target.length && i < values.length; i++) target[i] = values[i];
};

const BODY_STYLES = new Set<number>(Object.values(NOTE_BODY));

const bodyStyle = (v: string | undefined): NoteBodyStyle | undefined => {
	const n = v === undefined ? undefined : iniNumber(v);
	return n !== undefined && BODY_STYLES.has(n) ? n as NoteBodyStyle : undefined;
};

const flag = (v: string | undefined, fallback: boolean) => v === undefined ? fallback : iniBool(v);

// HitDivine is ours: osu! has no judgement above 300g
const IMAGE_COMMAND = new RegExp(`^(${[
	'NoteImage\\d+[HLT]?', 'KeyImage\\d+D?', 'Hit(0|50|100|200|300|300g|Divine)',
	'Stage(Left|Right|Bottom|Hint|Light)', 'Lighting[NL]', 'WarningArrow',
].join('|')})$`);

/** The settings stable plays a key count with: the skin's block for it, else all defaults. */
export const maniaConfig = (ini: SkinIni, keys: number): ManiaConfig => {
	const values = ini.mania.find(m => m.keys === keys)?.values ?? {};
	const version = versionNumber(ini.general.version);
	const num = (key: string, fallback: number) => iniNumber(values[key] ?? '') ?? fallback;
	const list = (key: string, n: number, fallback: number) => {
		const out = fill(n, fallback);
		if (values[key] !== undefined) overlay(out, iniNumbers(values[key]));
		return out;
	};
	const colour = (key: string, fallback: Rgba) => iniColour(values[key] ?? '', true) ?? fallback;
	const columns = (key: (i: number) => string, fallback: Rgba) =>
		Array.from({ length: keys }, (_, i) => colour(key(i), fallback));

	const lightFps = num('LightFramePerSecond', 60);
	const body = bodyStyle(values.NoteBodyStyle)
		?? (version < 2.5 ? NOTE_BODY.STRETCH : NOTE_BODY.REPEAT_BOTTOM);
	const keyFlip = flag(values.KeyFlipWhenUpsideDown, true);
	const noteFlip = flag(values.NoteFlipWhenUpsideDown, true);
	const splitStages = values.SplitStages === undefined ? undefined : iniBool(values.SplitStages);

	return {
		keys,
		columnStart: num('ColumnStart', 136),
		columnRight: num('ColumnRight', 19),
		columnWidth: list('ColumnWidth', keys, 30),
		columnSpacing: list('ColumnSpacing', keys - 1, 0),
		columnLineWidth: list('ColumnLineWidth', keys + 1, 2),
		barlineHeight: num('BarlineHeight', 1.2),
		lightingNWidth: list('LightingNWidth', keys, 0),
		lightingLWidth: list('LightingLWidth', keys, 0),
		widthForNoteHeightScale: Math.max(0, num('WidthForNoteHeightScale', 0)),
		hitPosition: Math.min(480, Math.max(240, num('HitPosition', 402))),
		lightPosition: num('LightPosition', 413),
		scorePosition: num('ScorePosition', 300),
		comboPosition: num('ComboPosition', 111),
		judgementLine: flag(values.JudgementLine, true),
		lightFramePerSecond: lightFps > 0 ? lightFps : 24,
		specialStyle: num('SpecialStyle', 0),
		comboBurstStyle: num('ComboBurstStyle', 1),
		...splitStages === undefined ? {} : { splitStages },
		stageSeparation: num('StageSeparation', 40),
		separateScore: flag(values.SeparateScore, true),
		keysUnderNotes: flag(values.KeysUnderNotes, false),
		upsideDown: flag(values.UpsideDown, false),
		noteBodyStyle: Array.from({ length: keys }, (_, i) =>
			bodyStyle(values[`NoteBodyStyle${i}`]) ?? body),
		keyFlip: Array.from({ length: keys }, (_, i) => ({
			up: flag(values[`KeyFlipWhenUpsideDown${i}`], keyFlip),
			down: flag(values[`KeyFlipWhenUpsideDown${i}D`], keyFlip),
		})),
		noteFlip: Array.from({ length: keys }, (_, i) => {
			const note = flag(values[`NoteFlipWhenUpsideDown${i}`], noteFlip);
			return {
				note,
				head: flag(values[`NoteFlipWhenUpsideDown${i}H`], note),
				body: flag(values[`NoteFlipWhenUpsideDown${i}L`], note),
				tail: flag(values[`NoteFlipWhenUpsideDown${i}T`], note),
			};
		}),
		colours: {
			column: columns(i => `Colour${i + 1}`, [0, 0, 0, 255]),
			light: columns(i => `ColourLight${i + 1}`, WHITE),
			columnLine: colour('ColourColumnLine', WHITE),
			barline: colour('ColourBarline', WHITE),
			judgementLine: colour('ColourJudgementLine', WHITE),
			keyWarning: colour('ColourKeyWarning', [0, 0, 0, 255]),
			hold: colour('ColourHold', [255, 191, 51, 255]),
			break: colour('ColourBreak', [255, 0, 0, 255]),
		},
		images: Object.fromEntries(Object.entries(values)
			.filter(([key]) => IMAGE_COMMAND.test(key))
			.map(([key, value]) => [key, value.replace(/^"|"$/g, '').replace(/\\\\/g, '\\')])),
	};
};

/** The default image a column falls back to: 1 or 2 alternating in from the edges, S for
 *  the middle column of an odd key count. */
export const columnType = (keys: number, column: number): '1' | '2' | 'S' => {
	if (keys % 2 === 1 && column === (keys - 1) / 2) return 'S';
	return Math.min(column, keys - 1 - column) % 2 === 0 ? '1' : '2';
};
