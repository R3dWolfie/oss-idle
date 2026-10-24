import type { ManiaGame } from '@oss-idle/shared/sim/maniaGame';
import type CharacterBot from '@oss-idle/shared/sim/bots/character';
import type Skin from '../../osu/skin/Skin';
import {
	SKILL,
	Skills,
	type SkillName,
} from '@oss-idle/shared/skills';
import { skillName } from '@oss-idle/shared/display/skills';
import { type Grade } from '@oss-idle/shared/judgement';

export type Viewport = {
	w: number,
	h: number,
	/** approach span in scroll units (ms a note is visible) - lower = faster scroll */
	scrollMs: number,
};

/** screen geometry derived from the viewport, the key count and the skin sizes */
export type PlayfieldGeometry = {
	keys: number,
	fieldWidth: number,
	/** y of the receptor / judgement line */
	lineY: number,
	pxPerUnit: number,
	/** left edge of the playfield */
	x0: number,
	/** right edge of the playfield and its HP bar */
	right: number,
	/** where the grade badge goes: left of the score, as tall as it (filled in as it draws) */
	grade: { right: number, top: number, height: number },
};

export type StrainHud = {
	/** the bot whose live strain feeds the gauges */
	bot: CharacterBot,
	labels: Record<SkillName, string>,
	/** where the gauges start, past anything drawn at the left edge */
	left?: number,
	/** how tired the character plays it, 0 rested to 1 exhausted */
	fatigue?: number,
	fatigueLabel?: string,
	/** how warmed up, 0 cold to 1 warm */
	warmup?: number,
	/** past warm-up's peak */
	cooling?: boolean,
	warmupLabel?: string,
	/** Cold, Warming up, ... Getting tired */
	warmupState?: string,
};

export type DrawOptions = {
	debug?: boolean,
	/** stacks the top-right accuracy/score lower (narrow screens) */
	mobile?: boolean,
	/** draws the per-skill strain gauges when set */
	strain?: StrainHud,
	/** fired only when the live grade changes (drive a DOM grade badge from it) */
	onGrade?: (grade: Grade) => void,
};

/** What the field layers draw: a game's, or a chart's in the editor's preview. */
export type Field = Pick<
	ManiaGame, 'keyCount' | 'notes' | 'scroll' | 'barlines' | 'columnFlash' | 'visibleNotesAt'
>;

/** A page canvas's 2D context, or a worker's (the editor draws its playfield in one). */
export type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** everything a layer needs to paint one frame */
export type Frame<G extends Field = ManiaGame> = {
	/** the game's page canvas, or a worker's for the field layers */
	ctx: G extends ManiaGame ? CanvasRenderingContext2D : Context2D,
	game: G,
	/** the skin, for the game's HUD: the stage layers draw from their layout's assets */
	skin: G extends ManiaGame ? Skin : unknown,
	/** song time in ms */
	now: number,
	/** the scroll position at `now` */
	nowPos: number,
	vp: Viewport,
	g: PlayfieldGeometry,
	opts: DrawOptions,
};

export const playfieldGeometry = (
	game: Field,
	skin: Skin,
	vp: Viewport,
): PlayfieldGeometry => {
	const keys = game.keyCount;
	const fieldWidth = keys * skin.data.playfield.columnWidth;
	const lineY = vp.h - skin.data.playfield.hitPosition;
	const x0 = (vp.w - fieldWidth) / 2;
	return {
		keys,
		fieldWidth,
		lineY,
		pxPerUnit: lineY / vp.scrollMs,
		x0,
		right: x0 + fieldWidth,
		grade: {
			right: 160, top: 16, height: 40,
		},
	};
};

/** y of a note at song time `time`, given the current `now`. */
export const noteY = (f: Frame<Field>, time: number): number =>
	posY(f, f.game.scroll.positionAt(time));

/** y of scroll position `pos` (a note's or bar line's, worked out once). */
export const posY = (f: Frame<Field>, pos: number): number =>
	f.g.lineY - (pos - f.nowPos) * f.g.pxPerUnit;

export const roundRect = (
	ctx: Context2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
) => {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
};

// skills whose live strain is meaningful to watch - the rest are hidden from the
// strain HUD (accuracy is a level constant; memory has no press strain of its own
// - it only reduces SpeedJam's)
export const STRAIN_HUD_HIDDEN = new Set<SkillName>([
	SKILL.accuracy,
	SKILL.memory,
	SKILL.consistency,
]);
export const STRAIN_HUD_SKILLS = Skills.filter(s => !STRAIN_HUD_HIDDEN.has(s));

/** per-skill display labels for the strain HUD, in the active locale */
export const strainLabels = (): Record<SkillName, string> =>
	Object.fromEntries(Skills.map(s => [s, skillName(s)])) as Record<SkillName, string>;
