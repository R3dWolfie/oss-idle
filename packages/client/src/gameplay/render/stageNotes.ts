import {
	NOTE_BODY,
	type NoteBodyStyle,
} from '@oss-idle/shared/osuSkin/mania';
import {
	dimmed,
	type ColumnAssets,
	type Sprite,
} from '../../osu/skin/maniaAssets';
import {
	noteY,
	posY,
	type Context2D,
} from './frame';
import {
	drawSprite,
	type StageField,
	type StageFrame,
	type StageLayer,
} from './stage';
import { frameAt } from './stageLayout';

type RenderNote = StageField['notes'][number];
type F = StageFrame<StageField>;

/** A note image's height: scaled with the column width, from the skin's note-height width. */
const heightOf = (f: F, s: Sprite) => s.h * f.L.noteRef / s.w;

const patterns = new WeakMap<CanvasImageSource, CanvasPattern>();
const tile = new DOMMatrix();

/** A hold body from `top` to `bottom` in the column at `x`, `w` wide: stretched, or repeated
 *  from its far end (an image drawn with its end at the top shows it there). */
export const fillBody = (
	ctx: Context2D, body: Sprite, style: NoteBodyStyle, x: number, w: number,
	top: number, bottom: number, t: number,
) => {
	if (bottom <= top) return;
	const img = frameAt(body, t);
	if (style === NOTE_BODY.STRETCH) {
		ctx.drawImage(img, x, top, w, bottom - top);
		return;
	}
	let pattern = patterns.get(img);
	if (!pattern) {
		pattern = ctx.createPattern(img, 'repeat')!;
		patterns.set(img, pattern);
	}
	// the tile at the sprite's own size: its bitmap may be kept smaller
	const iw = (img as ImageBitmap).width;
	const ih = (img as ImageBitmap).height;
	tile.a = w / iw;
	tile.d = body.h * w / body.w / ih;
	tile.e = x;
	tile.f = top;
	pattern.setTransform(tile);
	ctx.fillStyle = pattern;
	ctx.fillRect(x, top, w, bottom - top);
};

const drawBody = (f: F, body: Sprite, c: number, top: number, bottom: number, t: number) =>
	fillBody(f.ctx, body, f.L.assets.config.noteBodyStyle[c], f.L.colX[c], f.L.colW[c], top, bottom, t);

/** A hold from its head (at `yHead`) to its end (at `yTail`): the body runs from the middle
 *  of the head to the middle of the tail cap (turned over) just past the end, as osu! has it, so
 *  a cap drawn in half its image (a dome) meets the body, and a skin whose body image carries
 *  its own end keeps it in sight. */
const drawHold = (
	f: F, col: ColumnAssets, c: number, yHead: number, yTail: number, dim: boolean, bodyT: number,
) => {
	const { L } = f;
	const flip = L.assets.config.noteFlip[c];
	const head = dim && col.head ? dimmed(col.head) : col.head;
	const tail = dim && col.tail ? dimmed(col.tail) : col.tail;
	const body = dim && col.body ? dimmed(col.body) : col.body;
	const hh = head ? heightOf(f, head) : 0;
	const th = tail ? heightOf(f, tail) : 0;
	if (body) drawBody(f, body, c, yTail - th / 2, yHead - hh / 2, bodyT);
	if (tail) {
		const img = frameAt(tail, f.now);
		const v = L.assets.version >= 2.5;
		// turned over in v2.5+ skins: draw it from its bottom up
		if (v) {
			f.ctx.save();
			f.ctx.translate(0, 2 * yTail - th);
			f.ctx.scale(1, -1);
		}
		drawSprite(f, img, L.colX[c], yTail - th, L.colW[c], th, flip.tail);
		if (v) f.ctx.restore();
	}
	if (head) drawSprite(f, frameAt(head, f.now), L.colX[c], yHead - hh, L.colW[c], hh, flip.head);
};

const holdNote = (f: F, note: RenderNote, col: ColumnAssets, c: number) => {
	const { now, L } = f;
	if (note.tailJudged) {
		const broke = note.tailMissedAt;
		if (broke !== undefined) {
			// a dropped hold: what is left past the break scrolls off, darkened
			if (broke >= note.endTime) return;
			const yFrom = noteY(f, broke);
			const yTail = posY(f, note.tailPos);
			if (yFrom < -2 || yTail > L.h + 2) return;
			drawHold(f, col, c, yFrom, yTail, true, 0);
			return;
		}
		// let go a touch early but fine: it finishes its travel as if still held
		if (now >= note.endTime) return;
		drawHold(f, col, c, L.lineY, posY(f, note.tailPos), false, now - f.game.holdStart[c]);
		return;
	}
	const yHead = note.holding ? L.lineY : posY(f, note.headPos);
	const yTail = posY(f, note.tailPos);
	if (yHead < -2 || yTail > L.h + 2) return;
	const missed = note.headJudged && note.headOffset === undefined;
	drawHold(f, col, c, yHead, yTail, missed, note.holding ? now - f.game.holdStart[c] : 0);
};

/** The notes and holds, each with its column's images. */
export const drawStageNotes: StageLayer = (f) => {
	const { game, L } = f;
	const notes = game.notes;
	for (let i = 0; i < notes.length; i++) {
		const note = notes[i];
		const c = note.column;
		const col = L.assets.columns[c];
		if (note.hold) {
			holdNote(f, note, col, c);
			continue;
		}
		if (note.headJudged || !col.note) continue;
		const y = posY(f, note.headPos);
		const nh = heightOf(f, col.note);
		if (y < 0 || y - nh > L.h) continue;
		const flip = L.assets.config.noteFlip[c].note;
		drawSprite(f, frameAt(col.note, f.now), L.colX[c], y - nh, L.colW[c], nh, flip);
	}
};
