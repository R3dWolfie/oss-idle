import type { Note } from '@oss-idle/shared/editor/chart';
import type { EditorSkins } from './editorSkins';
import EditorPainter, {
	type Overlay,
	type PaintState,
} from './painter';
import EditorPreview from './preview';
import SongVisuals from './songVisuals';
import { DEFAULT_VISUALS } from './visualOptions';
import type {
	PlayfieldClock,
	ToPlayfield,
} from './playfieldMessages';

/**
 * The editor's playfield, drawn in a worker on a canvas of its own: nothing the page
 * does (React, layout, painting the panels, collecting its garbage) can hold a frame
 * back. The page sends what changed; the worker runs the song's clock on its own frames.
 */

let ctx: OffscreenCanvasRenderingContext2D | undefined;
let painter: EditorPainter | undefined;
let dpr = 1;
let w = 0;
let h = 0;
let skins: EditorSkins | undefined;
let overlay: Overlay = {};
const visuals = new SongVisuals();
let clock: PlayfieldClock = {
	playing: false, pausedAt: 0, startedAt: 0, length: 0, rate: 1,
};

// filled in by the page's messages; the painter and the preview read it every frame
const state: Partial<PaintState> & { selected: Set<Note> } = {
	selected: new Set(), divisor: 4, zoom: 0.3, preview: true, scrollMs: 500, sounds: false,
	field: DEFAULT_VISUALS.field,
};

const selectedOf = (indices: number[]) => new Set(indices.map(i => state.doc!.notes[i]));

/** The song's time at the frame begun at `frame` (this worker's clock). */
const nowAt = (frame: number): number => {
	if (!clock.playing) return clock.pausedAt;
	const played = performance.timeOrigin + frame - clock.startedAt;
	return Math.min(clock.length, clock.pausedAt + Math.max(0, played) * clock.rate);
};

const fit = () => {
	if (!ctx) return;
	ctx.canvas.width = w * dpr;
	ctx.canvas.height = h * dpr;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};

const loop = (frame: number) => {
	// the skins come decoded for the chart's key count; another one waits for its own
	if (ctx && skins && state.chart && state.doc && skins.field.keys === state.chart.keys) {
		const ready = state as PaintState;
		painter ??= new EditorPainter(ctx, ready, new EditorPreview(ready, dpr), visuals);
		painter.draw(skins, w, h, overlay, nowAt(frame));
	}
	requestAnimationFrame(loop);
};

const handle = (message: ToPlayfield) => {
	switch (message.kind) {
		case 'init':
			ctx = message.canvas.getContext('2d')!;
			dpr = message.dpr;
			fit();
			requestAnimationFrame(loop);
			return;
		case 'size':
			({ w, h } = message);
			fit();
			return;
		case 'skins':
			({ skins } = message);
			return;
		case 'chart':
			state.chart = message.chart;
			return;
		case 'doc':
			state.doc = message.doc;
			state.selected = selectedOf(message.selected);
			return;
		case 'select':
			state.selected = selectedOf(message.selected);
			return;
		case 'view':
			state.divisor = message.divisor;
			state.zoom = message.zoom;
			state.preview = message.preview;
			state.scrollMs = message.scrollMs;
			state.sounds = message.sounds;
			return;
		case 'clock':
			clock = message.clock;
			return;
		case 'song':
			visuals.setSong(message.pcm, message.rate);
			return;
		case 'visuals':
			visuals.setOptions(message.options);
			state.field = message.options.field;
			return;
		case 'reference':
			state.reference = message.doc;
			return;
		case 'overlay':
			overlay = message.overlay;
	}
};

self.onmessage = (e: MessageEvent<ToPlayfield>) => handle(e.data);
