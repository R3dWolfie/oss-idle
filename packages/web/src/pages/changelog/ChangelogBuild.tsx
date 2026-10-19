import './Changelog.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons/faChevronLeft';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
import Link from '../../components/Link';
import ChangelogNav from './ChangelogNav';
import UpdateStreams from './UpdateStreams';
import Build from './Build';
import { BUILDS } from './builds';

/** osu-web's build page: the build with its date, then links to its neighbours. */
export default function ChangelogBuild({ index, online }: {
	index: number;
	online: number | undefined;
}) {
	const build = BUILDS[index];
	const previous = BUILDS[index + 1];
	const next = BUILDS[index - 1];

	return (<>
		<ChangelogNav version={build.version} />
		<div className='changelog'>
			<UpdateStreams online={online} />
			<div className='builds'>
				<div className='builds__group'>
					<div className='builds__item'>
						<Build build={build} previous={previous} next={next} page />
					</div>
					<div className='page-nav'>
						<div className='page-nav__item page-nav__item--left'>
							{previous && (
								<Link to='/changelog/$version' params={{ version: previous.version }}>
									<FontAwesomeIcon icon={faChevronLeft} />
									<span className='page-nav__label'>{previous.version}</span>
								</Link>
							)}
						</div>
						<div className='page-nav__item'>
							{next && (
								<Link to='/changelog/$version' params={{ version: next.version }}>
									{next.version}
									<span className='page-nav__label'><FontAwesomeIcon icon={faChevronRight} /></span>
								</Link>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	</>);
}
