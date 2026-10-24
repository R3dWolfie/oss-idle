import type { ManiaGame } from '@oss-idle/shared/sim/maniaGame';
import type { Sprite } from '../../osu/skin/maniaAssets';
import {
	frameAt,
	type StageLayout,
} from './stageLayout';
import {
	posY,
	type Field,
	type Frame,
} from './frame';

/** What the stage layers draw: a game's, or a chart's in the editor's preview. */
export type StageField = Field & Pick<ManiaGame, 'holdStart' | 'holdEnd' | 'songStartMs'>;

/** A frame with the skin's stage laid out. */
export type StageFrame<G extends StageField = ManiaGame> = Frame<G> & { L: StageLayout };
export type StageLayer = (f: StageFrame<StageField>) => void;

/** How long a tapped key shows pressed, and the delay before it shows up again. */
const TAP_MS = 60;
const KEY_UP_DELAY = 80;
const LIGHT_FADE = 250;

const held = (game: StageField, c: number) => game.holdStart[c] > game.holdEnd[c];

/** When the column's key was last let go (Infinity while it is held). */
export const releasedAt = (game: StageField, c: number): number =>
	held(game, c) ? Infinity : Math.max(game.holdEnd[c], game.columnFlash[c] + TAP_MS);

const pressedAt = (game: StageField, c: number): number =>
	Math.max(game.holdStart[c], game.columnFlash[c]);

/**
 * Draw `sprite`'s frame into the box; when the stage is upside down and the element must not
 * turn with it, it is drawn the right way up again.
 */
export const drawSprite = (
	f: StageFrame<StageField>, img: CanvasImageSource, x: number, y: number, w: number, h: number,
	flips = true,
) => {
	const { ctx } = f;
	if (flips || !f.L.upsideDown) {
		ctx.drawImage(img, x, y, w, h);
		return;
	}
	ctx.save();
	ctx.translate(0, 2 * y + h);
	ctx.scale(1, -1);
	ctx.drawImage(img, x, y, w, h);
	ctx.restore();
};

/** Behind the notes: stage sides, column backgrounds and lines, the hit target, the lights. */
export const drawStageBack: StageLayer = (f) => {
	const { ctx, L, now, game } = f;
	const a = L.assets;
	const { h, u } = L;
	const { stageLeft, stageRight } = a;
	if (stageLeft) ctx.drawImage(stageLeft.frames[0], L.x0 - stageLeft.w * u, 0, stageLeft.w * u, h);
	if (stageRight) ctx.drawImage(stageRight.frames[0], L.x0 + L.width, 0, stageRight.w * u, h);
	for (let c = 0; c < L.keys; c++) {
		ctx.fillStyle = L.colBg[c];
		ctx.fillRect(L.colX[c], 0, L.colW[c], h);
	}
	ctx.fillStyle = L.lineStyle;
	for (let i = 0; i < L.lines.length; i += 2) ctx.fillRect(L.lines[i], 0, L.lines[i + 1], L.lineY);

	const hint = a.stageHint;
	if (hint) {
		const hh = hint.h * 0.9 * 1.6025 * u;
		ctx.drawImage(hint.frames[0], L.x0, L.lineY - hh / 2, L.width, hh);
	}
	if (a.config.judgementLine) {
		ctx.fillStyle = L.judgeLineStyle;
		ctx.fillRect(L.x0, L.lineY - u / 2, L.width, u);
	}

	const lightBottom = L.top + a.config.lightPosition * L.s;
	for (let c = 0; c < L.keys; c++) {
		const light = a.columns[c].light;
		if (!light) continue;
		const since = now - releasedAt(game, c);
		if (since >= LIGHT_FADE || now < pressedAt(game, c)) continue;
		const k = since > 0 ? 1 - since / LIGHT_FADE : 1;
		const lh = light.h * u * k;
		ctx.globalAlpha = k;
		ctx.drawImage(frameAt(light, now - pressedAt(game, c)), L.colX[c], lightBottom - lh, L.colW[c], lh);
	}
	ctx.globalAlpha = 1;
};

/** The bar lines, in the skin's colour and height. */
export const drawStageBarlines: StageLayer = (f) => {
	const { ctx, L, game } = f;
	ctx.fillStyle = L.barStyle;
	const barlines = game.barlines;
	for (let i = 0; i < barlines.length; i++) {
		const y = posY(f, barlines[i].pos);
		if (y < -L.barH || y > L.h + L.barH) continue;
		ctx.fillRect(L.x0, y - L.barH, L.width, L.barH);
	}
};

const WARNING_BARS = 3;

/** The warning arrows: on the last bar lines before the first note, scrolling down the middle
 *  of the stage like notes. */
export const drawWarningArrows: StageLayer = (f) => {
	const { L, game } = f;
	const arrow = L.assets.warningArrow;
	if (!arrow || f.now >= game.songStartMs) return;
	const barlines = game.barlines;
	let last = barlines.length - 1;
	while (last >= 0 && barlines[last].time >= game.songStartMs) last--;
	const aw = arrow.w * L.u;
	const ah = arrow.h * L.u;
	const x = L.x0 + (L.width - aw) / 2;
	for (let i = last; i >= 0 && i > last - WARNING_BARS; i--) {
		const y = posY(f, barlines[i].pos);
		if (y < 0 || y - ah > L.h) continue;
		f.ctx.drawImage(arrow.frames[0], x, y - ah, aw, ah);
	}
};

const keyImage = (f: StageFrame<StageField>, c: number): Sprite | undefined => {
	const col = f.L.assets.columns[c];
	const down = f.now >= pressedAt(f.game, c) && f.now < releasedAt(f.game, c) + KEY_UP_DELAY;
	return down ? col.keyDown ?? col.key : col.key;
};

/** The keys, standing on the bottom of the stage at their own height, stretched to the column. */
export const drawKeys: StageLayer = (f) => {
	const { L } = f;
	const cfg = L.assets.config;
	for (let c = 0; c < L.keys; c++) {
		const key = keyImage(f, c);
		if (!key) continue;
		const kh = key.h * L.u;
		const flip = key === L.assets.columns[c].keyDown ? cfg.keyFlip[c].down : cfg.keyFlip[c].up;
		drawSprite(f, key.frames[0], L.colX[c], L.h - kh, L.colW[c], kh, flip);
	}
};

/** Note and hold lighting, added onto everything at the hit line. */
export const drawLighting: StageLayer = (f) => {
	const { ctx, L, now, game } = f;
	const { lightingN, lightingL } = L.assets;
	ctx.globalCompositeOperation = 'lighter';
	for (let c = 0; c < L.keys; c++) {
		const cx = L.colX[c] + L.colW[c] / 2;
		if (lightingN) {
			const age = now - game.columnFlash[c];
			if (age >= 0 && age < 200) {
				ctx.globalAlpha = age < 80 ? age / 80 : 1 - (age - 80) / 120;
				const k = L.lightNScale[c] * L.u;
				const lw = lightingN.w * k;
				const lh = lightingN.h * k;
				ctx.drawImage(frameAt(lightingN, age), cx - lw / 2, L.lineY - lh / 2, lw, lh);
			}
		}
		if (lightingL) {
			const start = game.holdStart[c];
			const end = game.holdEnd[c];
			const holding = start > end;
			const since = now - end;
			if (start > -Infinity && (holding || since < 120) && now >= start) {
				const fadeIn = Math.min(1, (now - start) / 80);
				ctx.globalAlpha = holding ? fadeIn : fadeIn * (1 - since / 120);
				const k = L.lightLScale[c] * L.u;
				const lw = lightingL.w * k;
				const lh = lightingL.h * k;
				ctx.drawImage(frameAt(lightingL, now - start), cx - lw / 2, L.lineY - lh / 2, lw, lh);
			}
		}
	}
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
};

/** In front of the whole stage: its bottom image, never turned with an upside-down stage. */
export const drawStageFront: StageLayer = (f) => {
	const { L, now } = f;
	const bottom = L.assets.stageBottom;
	if (!bottom) return;
	const bw = bottom.w * L.s;
	const bh = bottom.h * L.s;
	drawSprite(f, frameAt(bottom, now), L.x0 + (L.width - bw) / 2, L.h - bh, bw, bh, false);
};
