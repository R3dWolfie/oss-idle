import './Pager.css';
import { useLingui } from '@lingui/react/macro';
import Link from '../Link';

/** Previous / next links for a paged leaderboard. Keeps the other search params. */
export default function Pager({ page, hasNext }: {
	page: number,
	hasNext: boolean,
}) {
	const { t } = useLingui();
	if (page === 1 && !hasNext) return;

	return (<div className='pager'>
		{page > 1 && <Link to='.' search={prev => ({
			...prev, page: page - 1,
		})}>{t`previous`}</Link>}
		<span>{t`page ${page}`}</span>
		{hasNext && <Link to='.' search={prev => ({
			...prev, page: page + 1,
		})}>{t`next`}</Link>}
	</div>);
}
