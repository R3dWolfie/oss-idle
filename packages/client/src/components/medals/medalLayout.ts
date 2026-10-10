export type MedalSlot = { x: number, y: number, size: number };

/** How the grid grows past the opening: a column (one more medal at the end of
 *  each row, top to bottom) or a row (filled left to right). Pinned for the
 *  designed openings: pair, triangle, square, 3 over 2. */
const OPENING: Record<number, 'column' | 'row'> = {
	2: 'column', 3: 'row', 5: 'column',
};

const cellSize = (rows: number, cols: number, width: number, height: number) =>
	Math.min(width / cols, height / rows);

/**
 * Where each medal sits once `count` have arrived, in arrival order. A medal
 * keeps its row and its place in that row for good; newcomers only ever extend
 * a row or open a new one. Rows are centred, so a row that grows shifts by half
 * a cell, and cells shrink as the grid grows - nothing else moves.
 */
export const medalSlots = (count: number, width: number, height: number): MedalSlot[] => {
	const cells: { row: number, index: number }[] = [];
	const lengths: number[] = [];
	let cols = 0;
	let open: number[] = [];
	for (let n = 1; n <= count; n++) {
		if (!open.length) {
			const rows = lengths.length;
			const grow = OPENING[n] ?? (n === 1 || cellSize(rows, cols + 1, width, height)
				>= cellSize(rows + 1, cols, width, height) ? 'column' : 'row');
			if (n === 1 || grow === 'row') {
				lengths.push(0);
				cols = Math.max(cols, 1);
				open = Array.from({ length: cols }, () => lengths.length - 1);
			} else {
				cols++;
				open = lengths.map((_, r) => r);
			}
		}
		const row = open.shift()!;
		cells.push({
			row, index: lengths[row]++,
		});
	}
	const size = cellSize(lengths.length, cols, width, height);
	const top = (height - size * lengths.length) / 2;
	return cells.map(({ row, index }) => ({
		x: width / 2 + (index - (lengths[row] - 1) / 2) * size,
		y: top + (row + 0.5) * size,
		size,
	}));
};
