import type { ManiaAssets } from '../osu/skin/maniaAssets';
import type { Context2D } from '../gameplay/render/frame';
import {
	drawKeys,
	drawLighting,
	drawStageBack,
	drawStageBarlines,
	drawStageFront,
	type StageFrame,
	type StageLayer,
} from '../gameplay/render/stage';
import { drawStageNotes } from '../gameplay/render/stageNotes';
import { stageLayout } from '../gameplay/render/stageLayout';
import ChartField from './chartField';
import { stageSpan } from './editorSkins';
import type { PaintState } from './painter';

const KEYS_OVER: StageLayer[] = [
	drawStageBack, drawStageBarlines, drawStageNotes, drawKeys, drawLighting, drawStageFront,
];
const KEYS_UNDER: StageLayer[] = [
	drawStageBack, drawKeys, drawStageBarlines, drawStageNotes, drawLighting, drawStageFront,
];

/**
 * The chart as it plays, beside the editor: the game's stage layers with the gameplay skin
 * and its scroll model (scroll speed changes included) at the editor's time, rebuilt with
 * each edit.
 */
export default class EditorPreview {

	private field?: ChartField;
	private builtFrom?: object;

	constructor(private readonly state: PaintState, private readonly dpr: number) {}

	/** The field for the chart as it stands. */
	private current(): ChartField {
		if (!this.field || this.state.doc !== this.builtFrom) {
			this.builtFrom = this.state.doc;
			this.field = new ChartField(this.state.chart, this.state.doc, this.field);
		}
		return this.field;
	}

	/** The last frame drawn, filled in again for the next: drawing allocates nothing. */
	private frame?: StageFrame<ChartField>;

	private frameFor(
		ctx: Context2D, game: ChartField, assets: ManiaAssets, h: number, scrollMs: number,
		scale: number,
	) {
		const last = this.frame;
		if (last?.ctx === ctx && last.L.assets === assets && last.L.h === h / scale
			&& last.vp.scrollMs === scrollMs) {
			last.game = game;
			return last;
		}
		// laid out at the game's size for `h`, on its own width (the stage starts at 0), and
		// reaching higher so that drawn `scale` times smaller, it still fills the height
		const L = stageLayout(assets, stageSpan(assets, h), h, this.dpr * scale, h / scale - h);
		const g = {
			keys: L.keys, fieldWidth: L.width, lineY: L.lineY, pxPerUnit: L.lineY / scrollMs, x0: L.x0,
			right: L.x0 + L.width, grade: {
				right: 0, top: 0, height: 0,
			},
		};
		return this.frame = {
			ctx, game, skin: undefined, now: 0, nowPos: 0, vp: {
				w: L.width, h: L.h, scrollMs,
			}, g, opts: {}, L,
		};
	}

	/** Draw the stage from `left`, at song time `now`, `scale` times the game's size. */
	public draw(
		ctx: Context2D, assets: ManiaAssets, left: number, h: number, now: number, scale: number,
	) {
		const game = this.current();
		if (assets.keys !== game.keyCount) return;
		const frame = this.frameFor(ctx, game, assets, h, this.state.scrollMs, scale);
		const { L } = frame;
		frame.now = now;
		frame.nowPos = game.scroll.positionAt(frame.now);
		game.seek(frame.now);
		ctx.save();
		ctx.translate(left, 0);
		ctx.scale(scale, scale);
		// only the columns: what a skin draws beside them would cover the editor's field
		ctx.beginPath();
		ctx.rect(L.x0, 0, L.width, L.h);
		ctx.clip();
		if (L.upsideDown) {
			ctx.translate(0, L.h);
			ctx.scale(1, -1);
		}
		const layers = assets.config.keysUnderNotes ? KEYS_UNDER : KEYS_OVER;
		for (let i = 0; i < layers.length; i++) layers[i](frame);
		ctx.restore();
	}

}
