import { Plural } from '@lingui/react/macro';
import Link from '../../components/Link';
import { BUILDS } from './builds';

/** osu-web's update-streams-v2, with our one stream. */
export default function UpdateStreams({ online }: { online: number | undefined }) {
	const latest = BUILDS[0];
	if (!latest) return null;
	return (
		<div className='update-streams'>
			<Link
				to='/changelog/$version'
				params={{ version: latest.version }}
				className='update-streams__item'
			>
				<span className='update-streams__bar' />
				<p className='update-streams__row update-streams__row--name'>oss!idle</p>
				<p className='update-streams__row update-streams__row--version'>{latest.version}</p>
				{!!online && (
					<p className='update-streams__row update-streams__row--users'>
						<Plural value={online} one='# user online' other='# users online' />
					</p>
				)}
			</Link>
		</div>
	);
}
