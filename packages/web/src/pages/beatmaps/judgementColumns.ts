import {
	JUDGEMENT,
	type Judgement,
} from '@oss-idle/shared/judgement';

/** osu!mania's names for the judgement columns: MAX, 300, 200, 100, 50, MISS. */
export const JUDGEMENT_COLUMNS: { judgement: Judgement; label: string }[] = [
	{
		judgement: JUDGEMENT.MARVELOUS, label: 'MAX',
	},
	{
		judgement: JUDGEMENT.PERFECT, label: '300',
	},
	{
		judgement: JUDGEMENT.GREAT, label: '200',
	},
	{
		judgement: JUDGEMENT.GOOD, label: '100',
	},
	{
		judgement: JUDGEMENT.BAD, label: '50',
	},
	{
		judgement: JUDGEMENT.MISS, label: 'MISS',
	},
];
