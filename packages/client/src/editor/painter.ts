import {
	eachSnapLine,
	multiplierOf,
	type Chart,
	type ChartDoc,
	type Note,
	type TimingPoint,
} from '@oss-idle/shared/editor/chart';
import type { Context2D } from '../gameplay/render/frame';
import type {
	ManiaAssets,
	Sprite,
} from '../osu/skin/maniaAssets';
import { fillBody } from '../gameplay/render/stageNotes';
import { soundNamesOf } from '@oss-idle/shared/editor/hitsounds';
import type SongVisuals from './songVisuals';
import type EditorPreview from './preview';
import type { FieldOptions } from './visualOptions';
import {
	fieldColumns,
	stageSpan,
	type EditorSkins,
} from './editorSkins';

const SNAP_COLORS: Record<number, string> = {
	1: '#ffffff',
	2: '#ff4d6a',
	3: '#b06cff',
	4: '#4d8dff',
	6: '#ff7ad9',
	8: '#ffd84d',
};
const FALLBACK_COLOR = '#9a9a9a';
const SELECTED_COLOR = '#ff66aa';
const PREVIEW_GAP = 60;

export type FieldGeometry = {
	x0: number,
	columnWidth: number,
	noteHeight: number,
	/** y of the current time */
	lineY: number,
	keys: number,
	/** where the live preview's field starts, when it is shown */
	previewLeft?: number,
	/** both fields drawn smaller than the game's, to fit between the side panels */
	scale: number,
};

/** What the playfield shows: the page's editor state, as the playfield's worker has it. */
export type PaintState = {
	chart: Chart,
	doc: ChartDoc,
	selected: Set<Note>,
	divisor: number,
	/** pixels per ms */
	zoom: number,
	/** the live preview is shown */
	preview: boolean,
	/** the preview's scroll speed */
	scrollMs: number,
	field: FieldOptions,
	/** another difficulty, drawn in the live preview's place */
	reference?: ChartDoc,
	/** each note's sound names written over it */
	sounds: boolean,
};

/** The width the side panels leave in the middle (as editor.css lays them out: 24px in, 270
 *  to 400px wide), less a margin. */
const middleWidth = (w: number) => w - 2 * (24 + Math.min(400, Math.max(270, (w - 760) / 2))) - 32;

export const fieldGeometry = (
	keys: number,
	preview: boolean,
	skins: EditorSkins,
	w: number,
	h: number,
): FieldGeometry => {
	const natural = fieldColumns(skins.field, h);
	// the preview's stage, or the reference difficulty drawn like this field
	const side = preview ? Math.max(keys * natural.columnWidth, stageSpan(skins.preview, h)) : 0;
	const gap = preview ? PREVIEW_GAP : 0;
	const scale = Math.min(1, (middleWidth(w) - gap) / (keys * natural.columnWidth + side));
	const columnWidth = natural.columnWidth * scale;
	const width = keys * columnWidth;
	const x0 = (w - width - side * scale - gap) / 2;
	return {
		x0, columnWidth, noteHeight: natural.noteHeight * scale, lineY: h * 0.8, keys,
		previewLeft: preview ? x0 + width + gap : undefined, scale,
	};
};

export const yAt = (g: FieldGeometry, zoom: number, now: number, time: number) =>
	g.lineY - (time - now) * zoom;

export const timeAt = (g: FieldGeometry, zoom: number, now: number, y: number) =>
	now + (g.lineY - y) / zoom;

/** What the pointer is doing on top of the chart. */
export type Overlay = {
	/** the note a click would place: snapped, stretched to a long note while dragging */
	ghost?: { column: number, time: number, end?: number },
	/** a box selection: from a song time to the pointer, `ahead` ms of the song past the
	 *  current time (so it follows the song under a still pointer); columns across as
	 *  fractions, where the pointer was */
	box?: { from: number, ahead: number, left: number, right: number },
	/** the selection where a drag would drop it */
	moving?: Note[],
};

type Drawn = Pick<Note, 'time' | 'column' | 'end'>;

/** A note image's height, drawn `w` wide. */
const heightAt = (s: Sprite, w: number) => s.h * w / s.w;

const MARKER_WIDTH = 46;
const BOOKMARK_WIDTH = 40;
const BOOKMARK_COLOR = '#ffff00';
const LABEL_SPACING = 14;

type Lane = {
	color: string,
	label: (point: TimingPoint) => string,
	/** where the label sits from its tick */
	dy: number,
};

const SV_LANE: Lane = {
	color: '#78dc78',
	label: point => `${Math.round(multiplierOf(point) * 100) / 100}x`,
	dy: -3,
};
const BPM_LANE: Lane = {
	color: '#ff4d6a',
	label: point => `${Math.round(60000 / point.beatLength * 10) / 10}`,
	dy: 12,
};

/** The index of the first of `items` (in time order) at or after `time`. */
const firstFrom = (items: { time: number }[], time: number): number => {
	let lo = 0;
	let hi = items.length;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (items[mid].time < time) lo = mid + 1;
		else hi = mid;
	}
	return lo;
};

/** Each point's label, made once: points are replaced, never changed, on an edit. */
const labels = new WeakMap<TimingPoint, string>();

/**
 * The editor's frames: the columns, the beat lines, the notes, the pointer's overlay,
 * the time line, and the live preview beside them. Its state carries over from frame
 * to frame, so drawing one allocates nothing.
 */
export default class EditorPainter {

	private skins?: EditorSkins;
	private g?: FieldGeometry;
	private geometryOf = {
		w: 0, h: 0, keys: 0, preview: false, skins: undefined as EditorSkins | undefined,
	};
	private now = 0;
	/** what the song's visuals are drawn against, filled in each frame */
	private readonly view = {
		lineY: 0, zoom: 0, now: 0,
	};
	private from = 0;
	private to = 0;
	/** the notes in time order and the longest long note, sorted again on an edit */
	private byTime = {
		of: undefined as Note[] | undefined, notes: [] as Note[], longest: 0, 
	};
	/** the notes' sound names, worked out again on an edit */
	private soundNames = {
		of: undefined as ChartDoc | undefined, names: new Map<Note, string[]>(),
	};

	constructor(
		private readonly ctx: Context2D,
		private readonly state: PaintState,
		private readonly preview: EditorPreview,
		private readonly visuals: SongVisuals,
	) {}

	/** One frame at song time `now`. */
	public draw(skins: EditorSkins, w: number, h: number, overlay: Overlay, now: number): void {
		const { ctx, state } = this;
		const g = this.geometry(skins, w, h);
		this.skins = skins;
		this.now = now;
		this.from = timeAt(g, state.zoom, now, h + g.noteHeight);
		this.to = timeAt(g, state.zoom, now, -g.noteHeight);

		ctx.clearRect(0, 0, w, h);
		this.drawField(g, h);
		const view = this.view;
		view.lineY = g.lineY;
		view.zoom = state.zoom;
		view.now = now;
		this.visuals.draw(ctx, g.x0, g.keys * g.columnWidth, h, view);
		ctx.font = '600 11px "Exo 2", sans-serif';
		ctx.textAlign = 'left';
		this.drawLane(g, state.doc.scroll, SV_LANE);
		this.drawLane(g, state.doc.timing, BPM_LANE);
		this.drawBookmarks(g);

		// only the visible stretch: a long note may reach in from before it
		const { notes, longest } = this.sorted();
		const from = firstFrom(notes, this.from - longest);
		for (let i = from; i < notes.length && notes[i].time <= this.to; i++) {
			const note = notes[i];
			const selected = state.selected.has(note);
			this.drawNote(g, note, selected && overlay.moving ? 0.3 : 1, selected && !overlay.moving);
		}
		const moving = overlay.moving;
		if (moving) for (let i = 0; i < moving.length; i++) this.drawNote(g, moving[i], 1, true);
		if (overlay.ghost) this.drawNote(g, overlay.ghost, 0.4, false);
		if (overlay.box) this.drawBox(g, overlay.box);
		if (state.sounds) this.drawSoundNames(g, notes, from);

		ctx.fillStyle = '#ffffff';
		ctx.fillRect(g.x0 - 12, g.lineY - 1, g.keys * g.columnWidth + 24, 2);

		if (g.previewLeft !== undefined && state.reference) {
			this.drawReference(state.reference, g, h);
		} else if (g.previewLeft !== undefined) {
			this.preview.draw(ctx, skins.preview, g.previewLeft, h, now, g.scale);
		}
	}

	/** What each visible note plays, a name a line from its head up. */
	private drawSoundNames(g: FieldGeometry, notes: Note[], from: number): void {
		const { ctx, state } = this;
		const kept = this.soundNames;
		if (kept.of !== state.doc) {
			kept.of = state.doc;
			kept.names = soundNamesOf(state.doc);
		}
		ctx.font = '600 10px "Exo 2", sans-serif';
		ctx.textAlign = 'center';
		ctx.lineWidth = 3;
		ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
		ctx.fillStyle = '#ffffff';
		const width = g.columnWidth - 4;
		for (let i = from; i < notes.length && notes[i].time <= this.to; i++) {
			const names = kept.names.get(notes[i]);
			if (!names) continue;
			const x = g.x0 + (notes[i].column + 0.5) * g.columnWidth;
			const head = this.y(g, notes[i].time) - g.noteHeight / 2 + 4;
			for (let line = 0; line < names.length; line++) {
				const y = head - line * 11;
				ctx.strokeText(names[line], x, y, width);
				ctx.fillText(names[line], x, y, width);
			}
		}
		ctx.textAlign = 'left';
		ctx.font = '600 11px "Exo 2", sans-serif';
	}

	private sorted() {
		const byTime = this.byTime;
		const notes = this.state.doc.notes;
		if (byTime.of !== notes) {
			byTime.of = notes;
			byTime.notes = [...notes].sort((a, b) => a.time - b.time);
			byTime.longest = notes.reduce((most, n) => Math.max(most, (n.end ?? n.time) - n.time), 0);
		}
		return byTime;
	}

	/** The field's geometry, worked out again only when what it depends on changed. */
	private geometry(skins: EditorSkins, w: number, h: number): FieldGeometry {
		const of = this.geometryOf;
		const keys = this.state.chart.keys;
		const preview = this.state.preview;
		const same = of.w === w && of.h === h && of.keys === keys && of.preview === preview
			&& of.skins === skins;
		if (!this.g || !same) {
			this.g = fieldGeometry(keys, preview, skins, w, h);
			of.w = w;
			of.h = h;
			of.keys = keys;
			of.preview = preview;
			of.skins = skins;
		}
		return this.g;
	}

	private y(g: FieldGeometry, time: number): number {
		return yAt(g, this.state.zoom, this.now, time);
	}

	private drawNote(g: FieldGeometry, note: Drawn, alpha: number, selected: boolean): void {
		const { ctx } = this;
		const end = note.end ?? note.time;
		if (end < this.from || note.time > this.to) return;
		const assets = this.skins!.field;
		const tap = assets.columns[note.column]?.note;
		const x = g.x0 + note.column * g.columnWidth;
		const w = g.columnWidth;
		const yHead = this.y(g, note.time);
		let top = yHead - g.noteHeight;
		ctx.globalAlpha = alpha;
		if (note.end !== undefined) {
			top = this.drawHold(assets, note.column, x, w, yHead, this.y(g, end), alpha);
		} else if (tap) {
			top = yHead - heightAt(tap, w);
			ctx.drawImage(tap.frames[0], x, top, w, yHead - top);
		}
		if (selected) {
			ctx.strokeStyle = SELECTED_COLOR;
			ctx.lineWidth = 3;
			ctx.strokeRect(x + 1, top, w - 2, yHead - top);
		}
		ctx.globalAlpha = 1;
	}

	/** A hold as the game draws it: the body from the head's middle to the end, the tail cap
	 *  past it, the head over both. Returns where its top is. */
	private drawHold(
		assets: ManiaAssets, c: number, x: number, w: number, yHead: number, yTail: number,
		alpha: number,
	): number {
		const { ctx } = this;
		const { head, body, tail } = assets.columns[c] ?? {};
		const hh = head ? heightAt(head, w) : 0;
		const th = tail ? heightAt(tail, w) : 0;
		ctx.globalAlpha = alpha * this.state.field.holds / 100;
		if (body) fillBody(ctx, body, assets.config.noteBodyStyle[c], x, w, yTail, yHead - hh / 2, 0);
		if (tail) {
			// turned over in v2.5+ skins
			const flip = assets.version >= 2.5;
			if (flip) {
				ctx.save();
				ctx.translate(0, 2 * yTail - th);
				ctx.scale(1, -1);
			}
			ctx.drawImage(tail.frames[0], x, yTail - th, w, th);
			if (flip) ctx.restore();
		}
		ctx.globalAlpha = alpha;
		if (head) ctx.drawImage(head.frames[0], x, yHead - hh, w, hh);
		return Math.min(yTail - th, yHead - hh);
	}

	private drawBox(g: FieldGeometry, box: NonNullable<Overlay['box']>): void {
		const { ctx } = this;
		const x = g.x0 + box.left * g.columnWidth;
		const width = (box.right - box.left) * g.columnWidth;
		const to = this.now + box.ahead;
		const top = this.y(g, Math.max(box.from, to));
		const height = this.y(g, Math.min(box.from, to)) - top;
		ctx.fillStyle = 'rgba(255, 102, 170, 0.15)';
		ctx.fillRect(x, top, width, height);
		ctx.strokeStyle = SELECTED_COLOR;
		ctx.lineWidth = 1;
		ctx.strokeRect(x, top, width, height);
	}

	/** Another difficulty as a field of its own at the preview's place, dimmed (Quaver's
	 *  45% black over it). */
	private drawReference(doc: ChartDoc, main: FieldGeometry, h: number): void {
		const { ctx } = this;
		const g = this.referenceGeometry(main);
		this.g = g;
		this.drawField(g, h, doc.timing);
		for (let i = 0; i < doc.notes.length; i++) this.drawNote(g, doc.notes[i], 1, false);
		this.g = main;
		ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
		ctx.fillRect(g.x0, 0, g.keys * g.columnWidth, h);
	}

	private referenceOf?: FieldGeometry;
	private reference?: FieldGeometry;

	private referenceGeometry(main: FieldGeometry): FieldGeometry {
		if (this.referenceOf !== main) {
			this.referenceOf = main;
			this.reference = {
				...main, x0: main.previewLeft!, previewLeft: undefined,
			};
		}
		return this.reference!;
	}

	/** The columns and the beat lines of the current snap. */
	private drawField(g: FieldGeometry, h: number, timing = this.state.doc.timing): void {
		const { ctx, state } = this;
		const width = g.keys * g.columnWidth;
		ctx.fillStyle = 'rgb(0, 0, 0)';
		ctx.globalAlpha = 0.55 * state.field.playfield / 100;
		ctx.fillRect(g.x0, 0, width, h);
		ctx.globalAlpha = 1;
		ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
		for (let k = 0; k <= g.keys; k++) ctx.fillRect(g.x0 + k * g.columnWidth, 0, 1, h);
		eachSnapLine(timing, this.from, this.to, state.divisor, this.drawSnapLine);
		ctx.globalAlpha = 1;
	}

	private readonly drawSnapLine = (time: number, denominator: number, measure: boolean): void => {
		const { ctx } = this;
		const g = this.g!;
		ctx.fillStyle = this.state.field.snapColours === 'white'
			? '#ffffff' : SNAP_COLORS[denominator] ?? FALLBACK_COLOR;
		ctx.globalAlpha = measure ? 0.9 : 0.45;
		ctx.fillRect(g.x0, Math.round(this.y(g, time)), g.keys * g.columnWidth, measure ? 2 : 1);
	};

	/** Bookmarks as bars across the field's right edge. */
	private drawBookmarks(g: FieldGeometry): void {
		const { ctx } = this;
		if (!this.state.field.bookmarks) return;
		const marks = this.state.doc.bookmarks;
		const x = g.x0 + g.keys * g.columnWidth - BOOKMARK_WIDTH / 2;
		ctx.fillStyle = BOOKMARK_COLOR;
		for (let i = 0; i < marks.length; i++) {
			if (marks[i] < this.from || marks[i] > this.to) continue;
			ctx.fillRect(x, Math.round(this.y(g, marks[i])) - 2, BOOKMARK_WIDTH, 4);
		}
	}

	/** One kind of timing point as ticks right of the field, labelled where there is room. */
	private drawLane(g: FieldGeometry, points: TimingPoint[], lane: Lane): void {
		const { ctx } = this;
		const left = g.x0 + g.keys * g.columnWidth + 4;
		ctx.fillStyle = lane.color;
		let lastLabel = Infinity;
		for (let i = firstFrom(points, this.from); i < points.length && points[i].time <= this.to; i++) {
			const point = points[i];
			const y = Math.round(this.y(g, point.time));
			ctx.fillRect(left, y, MARKER_WIDTH, 2);
			if (lastLabel - y < LABEL_SPACING) continue;
			let label = labels.get(point);
			if (label === undefined) labels.set(point, label = lane.label(point));
			ctx.fillText(label, left + 2, y + lane.dy);
			lastLabel = y;
		}
	}

}
