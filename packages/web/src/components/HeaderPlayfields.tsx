import {
	useEffect,
	useRef,
} from 'react';
import { Asset } from '../router';

type Playfields = {
	fps: number;
	visible: number;
	maps: { title: string; keys: number; frames: number[]; notes: number[] }[];
};

const COLUMN = 26;
const NOTE = 8;
// just enough to tell the playfields apart
const GAP = 16;
// frames faded in and out around the loop point
const FADE = 30;

const shuffle = <T,>(a: T[]) => a
	.map(v => ({
		v, k: Math.random(), 
	}))
	.sort((x, y) => x.k - y.k)
	.map(({ v }) => v);

/** The header's playfields: iconic maps from their preview point, frames from scripts/header-playfields.mts. */
export default function HeaderPlayfields() {
	const canvas = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const el = canvas.current;
		const ctx = el?.getContext('2d');
		if (!el || !ctx) return;
		let raf = 0;
		let stopped = false;

		void fetch(Asset('/playfields.json')).then(r => r.json()).then((data: Playfields) => {
			if (stopped) return;
			const maps = shuffle(data.maps);
			const offsets = maps.map(m => Math.floor(Math.random() * m.frames.length));
			const start = performance.now();
			let colour = '';
			let ticks = 0;

			const draw = (now: number) => {
				raf = requestAnimationFrame(draw);
				// scrolled out of view
				if (scrollY > el.clientHeight) return;
				const frame = Math.floor((now - start) * data.fps / 1000);
				// the section hue changes on navigation
				if (ticks++ % 30 === 0) {
					colour = `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--hsl-h1')})`;
				}
				const dpr = devicePixelRatio;
				const w = el.clientWidth;
				const h = el.clientHeight;
				if (el.width !== w * dpr) el.width = w * dpr;
				if (el.height !== h * dpr) el.height = h * dpr;
				ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
				ctx.clearRect(0, 0, w, h);
				ctx.fillStyle = colour;
				const scale = h / data.visible;
				const pitch = Math.max(...maps.map(m => m.keys)) * COLUMN + GAP;
				const count = Math.ceil(w / pitch) + 1;
				const left = (w - count * pitch + GAP) / 2;

				for (let p = 0; p < count; p++) {
					const map = maps[p % maps.length];
					const f = (offsets[p % maps.length] + frame + p * 97) % map.frames.length;
					const at = map.frames[f];
					const stage = map.keys * COLUMN;
					const x = Math.round(left + p * pitch + (pitch - GAP - stage) / 2);
					const fade = Math.min(1, f / FADE, (map.frames.length - f) / FADE);
					for (let i = 0; i < map.notes.length; i += 3) {
						const head = h - (map.notes[i + 1] - at) * scale;
						const tail = h - (map.notes[i + 2] - at) * scale;
						if (head < 0 || tail > h + NOTE) continue;
						const nx = x + map.notes[i] * COLUMN + 2;
						if (tail < head) {
							ctx.globalAlpha = 0.35 * fade;
							ctx.fillRect(nx + 4, tail, COLUMN - 12, head - tail);
						}
						ctx.globalAlpha = fade;
						ctx.fillRect(nx, head - NOTE, COLUMN - 4, NOTE);
					}
				}
			};
			raf = requestAnimationFrame(draw);
		});

		return () => {
			stopped = true;
			cancelAnimationFrame(raf);
		};
	}, []);

	return <canvas ref={canvas} className='topbar__playfields' aria-hidden='true' />;
}
