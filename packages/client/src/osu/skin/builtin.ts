import {
	GRADE,
	JUDGEMENT,
	type Grade,
	type Judgement,
} from '@oss-idle/shared/judgement';
import {
	ColorSchema,
	type Color,
} from '@oss-idle/shared/types/color';

/** How oss!idle's own UI shows a judgement: the result screen, tooltips, the hit-error bar. */
export type JudgeStyle = {
	text: string,
	judge: Color,
	hitErrorBg: Color,
	hitErrorTick: Color,
	devianceGraphBg: Color,
	devianceGraphTick: Color,
};

const uniform = (color: string, text: string): JudgeStyle => {
	const c = ColorSchema.parse(color);
	return {
		text, judge: c, hitErrorBg: c, hitErrorTick: c, devianceGraphBg: c, devianceGraphTick: c,
	};
};

/**
 * The game's own look outside what an osu! skin covers: judgement colours for the UI, the
 * HP graph. The default skin's images are drawn from the same values.
 */
export const BUILTIN = {
	judgements: {
		[JUDGEMENT.DIVINE]: uniform('#a8f0ff', 'DIVINE'),
		[JUDGEMENT.MARVELOUS]: uniform('#ffe88a', 'MARVELOUS'),
		[JUDGEMENT.PERFECT]: uniform('#ffd24a', 'PERFECT'),
		[JUDGEMENT.GREAT]: uniform('#6fe07a', 'GREAT'),
		[JUDGEMENT.GOOD]: uniform('#4aa6ff', 'GOOD'),
		[JUDGEMENT.BAD]: uniform('#b06bd6', 'BAD'),
		[JUDGEMENT.MISS]: uniform('#ff5a72', 'MISS'),
	} satisfies Record<Judgement, JudgeStyle>,
	/** where the HUD goes while the skin's stage is still decoding */
	playfield: {
		columnWidth: 74,
		hitPosition: 100,
	},
	hpBar: { lowThreshold: 0.3 },
};

/** The grades osu! has no image for keep ours. */
export const OWN_GRADES: Partial<Record<Grade, string>> = {
	[GRADE.XX]: '/grades/grade-XX.png',
	[GRADE.X]: '/grades/grade-X.png',
	[GRADE.F]: '/grades/grade-F.png',
};

/** The osu! ranking image each other grade shows. */
export const RANKING_IMAGES: Partial<Record<Grade, string>> = {
	[GRADE.SS]: 'ranking-X',
	[GRADE.S]: 'ranking-S',
	[GRADE.A]: 'ranking-A',
	[GRADE.B]: 'ranking-B',
	[GRADE.C]: 'ranking-C',
	[GRADE.D]: 'ranking-D',
};
