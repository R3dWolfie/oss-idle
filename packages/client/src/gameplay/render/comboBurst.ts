import type { StageFrame } from './stage';

const MILESTONE = 100;
const SLIDE_MS = 400;
const HOLD_MS = 600;
const FADE_MS = 400;

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

/**
 * The comboburst: at every 100 combo, one of the skin's images slides out from behind the
 * stage's side, holds, then fades. ComboBurstStyle picks the side (left, right, or either at
 * random), ComboBurstRandom whether the images come in order or at random.
 */
export const makeComboBurst = () => {
	let lastCombo = 0;
	let at = -Infinity;
	let next = 0;
	let shown = 0;
	let left = false;

	return (f: StageFrame) => {
		const { ctx, game, now, L } = f;
		const bursts = L.assets.comboBursts;
		const combo = game.score.combo;
		if (combo !== lastCombo) {
			if (combo > lastCombo && combo % MILESTONE === 0 && bursts.length) {
				at = now;
				const random = f.skin.osu?.ini.general.comboBurstRandom;
				shown = random ? Math.floor(Math.random() * bursts.length) : next++ % bursts.length;
				const style = L.assets.config.comboBurstStyle;
				left = style === 0 || (style === 2 && Math.random() < 0.5);
			}
			lastCombo = combo;
		}
		const age = now - at;
		const burst = bursts[shown];
		if (!burst || age < 0 || age >= SLIDE_MS + HOLD_MS + FADE_MS) return;
		const w = burst.w * L.u;
		const h = burst.h * L.u;
		const out = easeOut(Math.min(1, age / SLIDE_MS));
		const fade = age - SLIDE_MS - HOLD_MS;
		ctx.globalAlpha = fade > 0 ? 1 - fade / FADE_MS : 1;
		if (left) {
			// turned to face away from the stage
			ctx.save();
			ctx.translate(L.x0 + w * (1 - out), 0);
			ctx.scale(-1, 1);
			ctx.drawImage(burst.frames[0], 0, L.h - h, w, h);
			ctx.restore();
		} else {
			ctx.drawImage(burst.frames[0], L.x0 + L.width - w * (1 - out), L.h - h, w, h);
		}
		ctx.globalAlpha = 1;
	};
};
