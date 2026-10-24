import type { PlayfieldGeometry } from './render/frame';

let last = -1;

/** Where the playfield ends on the right, HP bar included, as `--playfield-right`:
 *  the dock keeps clear of it. Written only when it moves - this runs every frame. */
export const publishPlayfieldEdge = (g: PlayfieldGeometry): void => {
	const right = Math.ceil(g.right);
	if (right === last) return;
	last = right;
	document.documentElement.style.setProperty('--playfield-right', `${right}px`);
};
