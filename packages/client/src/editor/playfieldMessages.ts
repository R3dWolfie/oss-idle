import type {
	Chart,
	ChartDoc,
} from '@oss-idle/shared/editor/chart';
import type { EditorSkins } from './editorSkins';
import type { Overlay } from './painter';
import type { VisualOptions } from './visualOptions';

/** The song's clock, run by the worker on its own frames: playing from `pausedAt` since
 *  `startedAt` (ms since the epoch, which the page and the worker share). */
export type PlayfieldClock = {
	playing: boolean,
	pausedAt: number,
	startedAt: number,
	/** where the song stops */
	length: number,
	/** song ms per real ms: the playback speed */
	rate: number,
};

/** What the page tells the playfield's worker; selections are indices into the doc's notes. */
export type ToPlayfield =
	| { kind: 'init', canvas: OffscreenCanvas, dpr: number }
	| { kind: 'size', w: number, h: number }
	| { kind: 'skins', skins: EditorSkins }
	| { kind: 'chart', chart: Chart }
	| { kind: 'doc', doc: ChartDoc, selected: number[] }
	| { kind: 'select', selected: number[] }
	| {
		kind: 'view', divisor: number, zoom: number, preview: boolean, scrollMs: number, sounds: boolean,
	}
	| { kind: 'clock', clock: PlayfieldClock }
	| { kind: 'song', pcm: Float32Array, rate: number }
	| { kind: 'visuals', options: VisualOptions }
	| { kind: 'overlay', overlay: Overlay }
	| { kind: 'reference', doc?: ChartDoc };
