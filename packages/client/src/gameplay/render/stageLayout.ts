import type { Rgba } from '@oss-idle/shared/osuSkin/ini';
import type {
	ManiaAssets,
	Sprite,
} from '../../osu/skin/maniaAssets';

/**
 * Where a skin's stage lands on screen, worked out once per skin and screen size. Stable
 * lays the stage out in a 480-high space (`s` per unit) and draws images in a 768-high one
 * (`u` per pixel, half that for @2x), both scaled to the screen height.
 */
export type StageLayout = {
	assets: ManiaAssets,
	w: number,
	h: number,
	s: number,
	u: number,
	keys: number,
	x0: number,
	width: number,
	colX: number[],
	colW: number[],
	/** where the skin's 480-high space starts: lower than 0 on a stage stretched upwards */
	top: number,
	/** y of the hit line, counted from the top as if scrolling down */
	lineY: number,
	/** the width every note's height scales from */
	noteRef: number,
	upsideDown: boolean,
	colBg: string[],
	/** column lines: x, width */
	lines: number[],
	lineStyle: string,
	barStyle: string,
	barH: number,
	judgeLineStyle: string,
	/** how much bigger a column's lighting draws than its image */
	lightNScale: number[],
	lightLScale: number[],
};

export const css = ([r, g, b, a]: Rgba, alpha = a / 255) => `rgba(${r},${g},${b},${alpha})`;

/** Stable draws a column's background and lines with their alpha applied twice. */
const doubled = (c: Rgba) => css(c, (c[3] / 255) ** 2);

/** Each column's lines, as x and width pairs: inside its left edge, and its right one (before
 *  v2.4, only the last column's). */
const columnLines = (assets: ManiaAssets, colX: number[], colW: number[], u: number) => {
	const cfg = assets.config;
	const lines: number[] = [];
	const lineW = (i: number) => cfg.columnLineWidth[i] * 0.74 * u;
	for (let c = 0; c < assets.keys; c++) {
		if (cfg.columnLineWidth[c] > 0) lines.push(colX[c], lineW(c));
		const last = c === assets.keys - 1;
		if (cfg.columnLineWidth[c + 1] > 0 && (assets.version >= 2.4 || last)) {
			lines.push(colX[c] + colW[c] - lineW(c + 1), lineW(c + 1));
		}
	}
	return lines;
};

export const stageLayout = (
	assets: ManiaAssets, w: number, h: number, dpr = Math.min(window.devicePixelRatio || 1, 2),
	/** how much taller than `h` the stage reaches, above the screen it is laid out for */
	above = 0,
): StageLayout => {
	const cfg = assets.config;
	const keys = assets.keys;
	const s = h / 480;
	const u = h / 768;
	const colW = cfg.columnWidth.map(x => x * s);
	const colX: number[] = [];
	let x = 0;
	for (let c = 0; c < keys; c++) {
		colX.push(x);
		x += colW[c] + (cfg.columnSpacing[c] ?? 0) * s;
	}
	const span = x - (cfg.columnSpacing[keys - 1] ?? 0) * s;
	// stable places the stage at ColumnStart from the left; it never ran on a screen
	// narrower than 4:3, so there the stage is centred instead, as idle.ini can ask
	const centre = assets.stageCentre || w < h * 4 / 3;
	const start = centre ? (w - span) / 2 : cfg.columnStart * s;
	// column edges on whole device pixels: side by side, fractional edges leave seams
	const snap = (v: number) => Math.round(v * dpr) / dpr;
	for (let c = 0; c < keys; c++) {
		const left = snap(colX[c] + start);
		colW[c] = snap(colX[c] + start + colW[c]) - left;
		colX[c] = left;
	}
	const x0 = snap(start);
	const width = snap(start + span) - x0;

	const { judgementLine } = cfg.colours;
	const lightScale = (widths: number[]) => cfg.columnWidth.map((cw, c) =>
		assets.version < 2.5 ? 1 : (widths[c] || cw) / 30);

	return {
		assets,
		w,
		h: h + above,
		s,
		u,
		keys,
		x0,
		width,
		colX,
		colW,
		top: above,
		lineY: above + cfg.hitPosition * s,
		noteRef: (cfg.widthForNoteHeightScale || Math.min(...cfg.columnWidth)) * s,
		upsideDown: cfg.upsideDown,
		colBg: cfg.colours.column.map(doubled),
		lines: columnLines(assets, colX, colW, u),
		lineStyle: doubled(cfg.colours.columnLine),
		barStyle: css(cfg.colours.barline),
		barH: cfg.barlineHeight * u,
		judgeLineStyle: css(judgementLine, 0.9 * Math.max(1, judgementLine[3]) / 255),
		lightNScale: lightScale(cfg.lightingNWidth),
		lightLScale: lightScale(cfg.lightingLWidth),
	};
};

/** The frame of `sprite` showing `t` ms into its animation. */
export const frameAt = (sprite: Sprite, t: number): CanvasImageSource => {
	const n = sprite.frames.length;
	if (n === 1 || t <= 0) return sprite.frames[0];
	const i = Math.floor(t / sprite.frameMs);
	return sprite.frames[sprite.loop ? i % n : Math.min(i, n - 1)];
};
