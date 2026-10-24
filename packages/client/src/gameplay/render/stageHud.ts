import { i18n } from '@lingui/core';
import { JUDGEMENT } from '@oss-idle/shared/judgement';
import type { Font } from '../../osu/skin/maniaAssets';
import { frameAt } from './stageLayout';
import type { StageFrame } from './stage';

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const easeIn = (t: number) => t * t;

// one shared scratch for the characters of a number: drawing allocates nothing
const scratch: string[] = [];
let scratchLength = 0;

const fill = (text: string) => {
	scratchLength = text.length;
	for (let i = 0; i < text.length; i++) scratch[i] = text[i];
};

const FIXED_EXCLUDED = ',.%x';

/** The width of what `fill` left in the scratch, in the font's own units. */
const measure = (font: Font, fixed: boolean) => {
	const five = font.glyphs['5']?.w ?? 0;
	let w = 0;
	for (let i = 0; i < scratchLength; i++) {
		const ch = scratch[i];
		w += fixed && !FIXED_EXCLUDED.includes(ch) ? five : font.glyphs[ch]?.w ?? 0;
	}
	return w - font.overlap * Math.max(0, scratchLength - 1);
};

/** Draw the scratch with `font`, its left edge at `x` and its top at `y`, `k` px per unit. */
const drawScratch = (
	ctx: CanvasRenderingContext2D, font: Font, fixed: boolean, x: number, y: number, k: number, sy = 1,
) => {
	const five = font.glyphs['5']?.w ?? 0;
	for (let i = 0; i < scratchLength; i++) {
		const g = font.glyphs[scratch[i]];
		const cell = fixed && !FIXED_EXCLUDED.includes(scratch[i]) ? five : g?.w ?? 0;
		if (g) ctx.drawImage(g.img, x + (cell - g.w) / 2 * k, y, g.w * k, g.h * k * sy);
		x += (cell - font.overlap) * k;
	}
};

const glyphHeight = (font: Font) => font.glyphs['0']?.h ?? 0;

/** A small random tilt for a miss, the same for the same miss on every frame. */
const tilt = (time: number) => {
	const random = ((Math.sin(time * 12.9898) * 43758.5453) % 1 + 1) % 1;
	return (random * 2 - 1) * 5.73 * Math.PI / 180;
};

/** The hit burst of the last judgement, stable's way: a pop in, a shrink, a fade. */
const drawJudgement = (f: StageFrame) => {
	const { ctx, game, now, L } = f;
	const flash = game.lastFlash;
	if (!flash) return;
	const age = now - flash.time;
	const sprite = L.assets.judgements[flash.judgement];
	if (!sprite || age < 0 || age >= 220) return;
	const miss = flash.judgement === JUDGEMENT.MISS;
	let scale: number;
	if (miss) scale = 1.2 - 0.2 * easeOut(Math.min(1, age / 100));
	else if (age < 40) scale = 0.8 + 0.2 * age / 40;
	else if (age < 80) scale = 0.85 - 0.15 * (age - 40) / 40;
	else if (age < 180) scale = 0.7;
	else scale = 0.7 - 0.3 * easeIn((age - 180) / 40);
	const alpha = age < 20 ? age / 20 : age < 180 ? 1 : 1 - (age - 180) / 40;
	const w = sprite.w * L.u * scale;
	const h = sprite.h * L.u * scale;
	const y0 = L.assets.config.scorePosition * L.s;
	const y = L.upsideDown ? L.h - y0 : y0;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.translate(L.x0 + L.width / 2, y);
	if (miss) ctx.rotate(tilt(flash.time) * easeOut(Math.min(1, age / 100)));
	ctx.drawImage(frameAt(sprite, age), -w / 2, -h / 2, w, h);
	ctx.restore();
};

/** The combo counter: tinted while a hold is held, bumped on each hit, burst off on a break. */
const makeCombo = () => {
	let last = 0;
	let text = '';
	let bumpAt = -Infinity;
	let broke = '';
	let brokeAt = -Infinity;

	return (f: StageFrame) => {
		const { ctx, game, now, L } = f;
		const combo = game.score.combo;
		if (combo !== last) {
			if (combo > last) bumpAt = now;
			else if (combo === 0 && last > 0) {
				broke = text;
				brokeAt = now;
			}
			last = combo;
			text = String(combo);
		}
		const a = L.assets;
		const k = L.u;
		const cx = L.x0 + L.width / 2;
		const y0 = a.config.comboPosition * L.s;
		const cy = L.upsideDown ? L.h - y0 : y0;

		const breakAge = now - brokeAt;
		if (breakAge >= 0 && breakAge < 200) {
			fill(broke);
			const scale = 1 + 3 * breakAge / 200;
			const w = measure(a.comboBreak, false) * k * scale;
			const h = glyphHeight(a.comboBreak) * k * scale;
			ctx.globalCompositeOperation = 'lighter';
			ctx.globalAlpha = 0.8 * (1 - breakAge / 200);
			drawScratch(ctx, a.comboBreak, false, cx - w / 2, cy - h / 2, k * scale);
			ctx.globalAlpha = 1;
			ctx.globalCompositeOperation = 'source-over';
		}
		if (combo <= 0) return;

		let holding = false;
		for (let c = 0; c < L.keys; c++) if (game.holdStart[c] > game.holdEnd[c]) holding = true;
		const font = holding ? a.comboHold : a.combo;
		fill(text);
		const sy = 1 + 0.4 * (1 - easeOut(Math.min(1, Math.max(0, now - bumpAt) / 300)));
		const w = measure(font, false) * k;
		const h = glyphHeight(font) * k;
		drawScratch(ctx, font, false, cx - w / 2, cy - h * sy / 2, k, sy);
	};
};

/** Score, then accuracy under it, in the skin's score font at the top right. */
const makeScore = () => {
	let scoreValue = -1;
	let scoreText = '';
	let accValue = -1;
	let accText = '';

	return (f: StageFrame, top: number) => {
		const { ctx, game, L } = f;
		const font = L.assets.score;
		const score = Math.round(game.score.score);
		if (score !== scoreValue) {
			scoreValue = score;
			scoreText = String(score).padStart(8, '0');
		}
		if (game.score.accuracy !== accValue) {
			accValue = game.score.accuracy;
			// with the language's decimal mark, as stable writes it in the system's
			const mark = (1.5).toLocaleString(i18n.locale || undefined).charAt(1);
			accText = `${(accValue * 100).toFixed(2).replace('.', mark)}%`;
		}
		const sk = 0.96 * L.u;
		fill(scoreText);
		const left = L.w - 10 * L.u - measure(font, true) * sk;
		drawScratch(ctx, font, true, left, top, sk);
		const grade = f.g.grade;
		grade.right = L.w - left + 8 * L.u;
		grade.top = top;
		grade.height = glyphHeight(font) * sk;
		const ak = 0.6 * 0.96 * L.u;
		fill(accText);
		const ay = top + glyphHeight(font) * sk + 9 * L.u;
		drawScratch(ctx, font, true, L.w - 17 * L.u - measure(font, true) * ak, ay, ak);
	};
};

/** The HP bar's scale in mania: 0.7 of osu!'s own, an image pixel per unit of the 768-high
 *  space (measured on stable). */
const barScale = (L: StageFrame['L']) => 0.7 * L.u;

const drawScorebar = (f: StageFrame, hp: number) => {
	const { ctx, L, now } = f;
	const { bg, colour, marker, ki, kiDanger, kiDanger2 } = L.assets.scorebar;
	if (!bg) return;
	const k = barScale(L);
	ctx.save();
	ctx.translate(L.x0 + L.width + 3 * L.u, L.h);
	ctx.rotate(-Math.PI / 2);
	ctx.drawImage(bg.frames[0], 0, 0, bg.w * k, bg.h * k);
	// where the fill sits on the background (osu!'s offsets, in its 480-high units): the
	// marker style has its own
	const newStyle = !!marker;
	const ox = (newStyle ? 7.5 : 3) * 1.6 * k;
	const oy = (newStyle ? 7.8 : 10) * 1.6 * k;
	const v = Math.max(0, Math.min(1, hp));
	if (colour && v > 0) {
		const img = frameAt(colour, now) as ImageBitmap;
		ctx.drawImage(img, 0, 0, img.width * v, img.height, ox, oy, colour.w * k * v, colour.h * k);
	}
	const tip = marker ?? (v < 0.2 ? kiDanger2 : v < 0.5 ? kiDanger : undefined) ?? ki;
	if (tip && colour) {
		const ty = newStyle ? oy + colour.h * k / 2 : oy;
		const tw = tip.w * k;
		const th = tip.h * k;
		ctx.drawImage(tip.frames[0], ox + colour.w * k * v - tw / 2, ty - th / 2, tw, th);
	}
	ctx.restore();
};

/** How far right of the stage the HP bar reaches. */
export const scorebarThickness = (f: Pick<StageFrame, 'L'>) =>
	3 * f.L.u + (f.L.assets.scorebar.bg?.h ?? 0) * barScale(f.L);

/** The skinned part of the HUD: the hit burst, the combo, score and accuracy, the HP bar. */
export const makeStageHud = () => {
	const combo = makeCombo();
	const score = makeScore();
	return (f: StageFrame, hp: number, top: number) => {
		drawScorebar(f, hp);
		drawJudgement(f);
		combo(f);
		score(f, top);
	};
};
