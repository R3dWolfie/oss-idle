import './Changelog.css';

import { useState } from 'react';
import { Trans } from '@lingui/react/macro';
import ShowMoreLink from '../../components/ShowMoreLink';
import ChangelogNav from './ChangelogNav';
import UpdateStreams from './UpdateStreams';
import Build from './Build';
import { BUILDS } from './builds';
import { formatBuildDate } from './formatBuildDate';

const PAGE = 20;

/** osu-web's changelog index: builds grouped by day, newest first. */
export default function Changelog({ online }: { online: number | undefined }) {
	const [shown, setShown] = useState(PAGE);

	const days = new Map<string, typeof BUILDS>();
	for (const b of BUILDS.slice(0, shown)) days.set(b.date, [...days.get(b.date) ?? [], b]);

	return (<>
		<ChangelogNav />
		<div className='changelog'>
			<UpdateStreams online={online} />
			{BUILDS.length === 0 && (
				<p className='builds__date'><Trans>No builds yet. Check back soon!</Trans></p>
			)}
			<div className='builds'>
				{[...days].map(([date, builds]) => (
					<div key={date} className='builds__group'>
						<div className='builds__date'>{formatBuildDate(date)}</div>
						{builds.map(b => <div key={b.version} className='builds__item'><Build build={b} /></div>)}
					</div>
				))}
			</div>
			<ShowMoreLink
				hasMore={shown < BUILDS.length}
				loading={false}
				onClick={() => setShown(s => s + PAGE)}
			/>
		</div>
	</>);
}
