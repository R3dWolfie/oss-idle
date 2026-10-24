import {
	JUDGEMENT,
	type Judgement,
} from '../judgement.js';
import {
	iniBool,
	iniColour,
	iniLines,
	iniNumber,
	type Rgba,
} from './ini.js';

/**
 * idle.ini: what an osu! skin can say about oss!idle that skin.ini has no command for.
 *
 *   [Judgements]        the colour of each judgement on the results screen, in tooltips and
 *   Divine: 168,240,255 on the hit-error bar and graphs
 *   [JudgementNames]    how they are written there
 *   Divine: DIVINE
 *   [Mania]
 *   Keys: 4
 *   StageCentre: 1      the stage in the middle of the screen, whatever its ColumnStart
 */
export type IdleIni = {
	judgements: Partial<Record<Judgement, Rgba>>,
	judgementNames: Partial<Record<Judgement, string>>,
	mania: { keys: number, stageCentre?: boolean }[],
};

const JUDGEMENT_KEYS: Record<string, Judgement> = {
	Divine: JUDGEMENT.DIVINE,
	Marvelous: JUDGEMENT.MARVELOUS,
	Perfect: JUDGEMENT.PERFECT,
	Great: JUDGEMENT.GREAT,
	Good: JUDGEMENT.GOOD,
	Bad: JUDGEMENT.BAD,
	Miss: JUDGEMENT.MISS,
};

export const emptyIdleIni = (): IdleIni => ({
	judgements: {}, judgementNames: {}, mania: [],
});

type Reader = { ini: IdleIni, section: string, block?: IdleIni['mania'][number] };

const readJudgement = (r: Reader, key: string, value: string) => {
	const judgement = JUDGEMENT_KEYS[key];
	if (!judgement) return;
	if (r.section === 'Judgements') {
		const colour = iniColour(value, true);
		if (colour) r.ini.judgements[judgement] = colour;
	} else if (value) r.ini.judgementNames[judgement] = value;
};

const readMania = (r: Reader, key: string, value: string) => {
	if (key === 'Keys') {
		const keys = iniNumber(value);
		if (keys === undefined || !Number.isInteger(keys) || keys <= 0) return;
		r.block = { keys };
		// a second block for a key count already seen is dropped
		if (!r.ini.mania.some(m => m.keys === keys)) r.ini.mania.push(r.block);
	} else if (r.block && key === 'StageCentre') r.block.stageCentre = iniBool(value);
};

/** Read an idle.ini; what it does not say is left to the skin behind it. */
export const parseIdleIni = (text: string): IdleIni => {
	const r: Reader = {
		ini: emptyIdleIni(), section: '',
	};
	for (const line of iniLines(text)) {
		if ('section' in line) {
			r.section = line.section;
			r.block = undefined;
		} else if (r.section === 'Judgements' || r.section === 'JudgementNames') {
			readJudgement(r, line.key, line.value);
		} else if (r.section === 'Mania') readMania(r, line.key, line.value);
	}
	return r.ini;
};
