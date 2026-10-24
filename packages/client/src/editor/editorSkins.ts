import type { ManiaAssets } from '../osu/skin/maniaAssets';

/** What the editor draws with: its own skin's notes on the field where they are placed, the
 *  gameplay skin's stage in the preview beside it. */
export type EditorSkins = { field: ManiaAssets, preview: ManiaAssets };

const DEFAULT_NOTE_RATIO = 24 / 74;

/** The field's column width and note height at `h` high: the skin's columns (even, at
 *  their mean width) scaled like the game's stage. */
export const fieldColumns = (assets: ManiaAssets, h: number) => {
	const widths = assets.config.columnWidth;
	const columnWidth = widths.reduce((total, w) => total + w, 0) / widths.length * h / 480;
	const note = assets.columns[0]?.note;
	return {
		columnWidth,
		noteHeight: columnWidth * (note ? note.h / note.w : DEFAULT_NOTE_RATIO),
	};
};

/** The preview's stage width at `h` high, spacing included. */
export const stageSpan = (assets: ManiaAssets, h: number): number => {
	const { columnWidth, columnSpacing } = assets.config;
	const units = columnWidth.reduce((total, w) => total + w, 0)
		+ columnSpacing.reduce((total, s) => total + s, 0);
	return units * h / 480;
};
