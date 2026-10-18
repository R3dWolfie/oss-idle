import { Plural } from '@lingui/react/macro';
import { ph } from '@lingui/core/macro';

/** "1 year, 2 months". */
export default function SupportDuration({ months }: { months: number }) {
	const years = Math.floor(months / 12);
	const rest = months % 12;
	return <>
		{years > 0 && <Plural value={ph({ years })} one='# year' other='# years' />}
		{years > 0 && rest > 0 && ', '}
		{(rest > 0 || years === 0)
			&& <Plural value={ph({ months: rest })} one='# month' other='# months' />}
	</>;
}
