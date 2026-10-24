import type { PlayfieldGeometry } from './render/frame';

/** Keeps the DOM grade badge left of the score the canvas draws, where the skin's font puts
 *  it. Writes the style only when it moves: this runs every frame. */
export const makeGradePlacer = () => {
	let right = -1;
	let top = -1;
	let height = -1;
	return (el: HTMLElement | null, g: PlayfieldGeometry) => {
		if (!el) return;
		const r = Math.round(g.grade.right);
		const t = Math.round(g.grade.top);
		const h = Math.round(g.grade.height);
		if (r === right && t === top && h === height) return;
		right = r;
		top = t;
		height = h;
		el.style.right = `${r}px`;
		el.style.top = `${t}px`;
		el.style.height = `${h}px`;
	};
};
