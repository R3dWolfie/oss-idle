import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons/faChevronLeft';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
import Link from '../../components/Link';
import ChangelogEntry from './ChangelogEntry';
import {
	type Build as BuildData,
	type Entry,
} from './builds';
import { formatBuildDate } from './formatBuildDate';

function VersionNav({ build, icon }: { build: BuildData | undefined; icon: typeof faChevronLeft }) {
	if (!build) {
		return (
			<span className='build__version-link build__version-link--disabled'>
				<FontAwesomeIcon icon={icon} />
			</span>
		);
	}
	return (
		<Link
			to='/changelog/$version'
			params={{ version: build.version }}
			className='build__version-link'
			title={build.version}
		>
			<FontAwesomeIcon icon={icon} />
		</Link>
	);
}

/** osu-web's Build: the stream and version, then entries grouped by category (sorted). */
export default function Build({ build, previous, next, page = false }: {
	build: BuildData;
	previous?: BuildData;
	next?: BuildData;
	page?: boolean;
}) {
	const byCategory = new Map<string, Entry[]>();
	for (const e of build.entries) byCategory.set(e.category, [...byCategory.get(e.category) ?? [], e]);

	return (
		<div className={`build ${page ? 'build--page' : ''}`}>
			<div className='build__version'>
				{page && <VersionNav build={previous} icon={faChevronLeft} />}
				<Link to='/changelog/$version' params={{ version: build.version }} className='build__version-link'>
					<span className='build__stream'>oss!idle</span>
					{' '}
					<span className='build__stream-version'>{build.version}</span>
				</Link>
				{page && <VersionNav build={next} icon={faChevronRight} />}
			</div>

			{page && <div className='build__date'>{formatBuildDate(build.date)}</div>}

			{[...byCategory.keys()].sort().map(category => (
				<div key={category}>
					<div className='build__category'>{category}</div>
					{byCategory.get(category)!.map(entry => <ChangelogEntry key={entry.title} entry={entry} />)}
				</div>
			))}
		</div>
	);
}
