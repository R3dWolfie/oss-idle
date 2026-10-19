import type { ManiaGame } from '@oss-idle/shared/sim/maniaGame';
import type Skin from '../osu/skin/Skin';
import {
	playfieldGeometry,
	type DrawOptions,
	type Frame,
	type Layer,
	type PlayfieldGeometry,
	type Viewport,
} from './render/frame';
import { drawPlayfield } from './render/playfield';
import { drawBarlines } from './render/barlines';
import { drawNotes } from './render/notes';
import { drawReceptors } from './render/receptors';
import { makeHud } from './render/hud';

export type {
	Viewport,
	PlayfieldGeometry,
	DrawOptions,
	StrainHud,
} from './render/frame';
export {
	playfieldGeometry,
	roundRect,
	strainLabels,
	STRAIN_HUD_SKILLS,
} from './render/frame';

/**
 * Draws a full mania gameplay frame by stacking the render layers in order -
 * playfield → barlines → notes → receptors → HUD - onto a 2D canvas from a skin.
 * Each layer lives in its own file under `render/`; this just composes them and
 * builds the per-frame {@link Frame} they share. Used by the live Gameplay scene
 * and the skin-view preview so the visuals live in one place.
 *
 * The background and dim are DOM layers beneath the transparent canvas (the caller
 * owns them); the grade badge is a DOM element fed via `opts.onGrade`.
 */
export default class GameplayRenderer {

	// stacked back-to-front; mirrored vertically for upscroll
	private readonly field: Layer[] = [
		drawPlayfield,
		drawBarlines,
		drawNotes,
		drawReceptors,
	];

	// carries eased state so it's an instance
	private readonly hud = makeHud();

	constructor(
		private ctx: CanvasRenderingContext2D,
		private game: ManiaGame,
		private skin: Skin,
	) {}

	setSkin(skin: Skin) {
		this.skin = skin;
	}

	/** clear the canvas (background + dim are DOM layers beneath the transparent canvas) */
	clear(vp: Viewport) {
		this.ctx.clearRect(0, 0, vp.w, vp.h);
	}

	/** draw the whole frame at song time `now`; returns the geometry for play-only chrome */
	draw(now: number, vp: Viewport, opts: DrawOptions = {}): PlayfieldGeometry {
		const g = playfieldGeometry(this.game, this.skin, vp);
		const frame: Frame = {
			ctx: this.ctx,
			game: this.game,
			skin: this.skin,
			now,
			vp,
			g,
			opts,
		};
		this.ctx.save();
		if (this.skin.data.playfield.upscroll) {
			this.ctx.translate(0, vp.h);
			this.ctx.scale(1, -1);
		}
		for (const layer of this.field) layer(frame);
		this.ctx.restore();
		this.hud(frame);
		return g;
	}

}
