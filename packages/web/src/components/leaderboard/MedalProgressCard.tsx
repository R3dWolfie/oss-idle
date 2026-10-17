import { ph } from '@lingui/core/macro';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import Link from '../Link';
import Flag from '../Flag';
import rank from '@osu-idle/shared/display/rank';
import MedalLineIcon from './MedalLineIcon';
import {
	LINE_NAMES,
	lineStanding,
	lineValue,
	type Goal,
} from './medalLine';

type Row = { id: number, name: string, country: string, value: number, current: number };

/** One medal line on the overview: its medals and the players furthest along it. */
export default function MedalProgressCard({ line, goals, rows }: {
	line: string,
	goals: Goal[],
	rows: Row[],
}) {
	const { i18n, t } = useLingui();
	return <div className='medal-progress__card'>
		<Link
			to='/rankings/medals/progress/$line'
			params={{ line }}
			search={{ page: 1 }}
			className='medal-progress__title'>
			{i18n._(LINE_NAMES[line])}
		</Link>
		<div className='medal-line'>
			{goals.map(g => <MedalLineIcon key={g.id} id={g.id} />)}
		</div>
		<div className='medal-progress__rows'>
			{rows.map((row, r) => {
				const { reached } = lineStanding(goals, row.value);
				return <div key={row.id} className='medal-progress__row'>
					<span className='medal-progress__rank'>{rank(r + 1)}</span>
					<Flag country={row.country} />
					<Link to='/c/$id' params={{ id: String(row.id) }} className='medal-progress__name'>{row.name}</Link>
					<span className='medal-progress__value'>
						{row.current < row.value && <span className='medal-progress__now'>
							<Trans>now {ph({ now: lineValue(line, row.current) })}</Trans>
						</span>}
						{lineValue(line, row.value)}
					</span>
					{reached ? <MedalLineIcon id={reached.id} /> : <span className='medal-line__icon' />}
				</div>;
			})}
			{!rows.length && <div className='medal-progress__empty'>{t`Nobody yet`}</div>}
		</div>
	</div>;
}
