import './GroupBadge.css';
import Link from '../Link';
import {
	GROUP_BADGE,
	type Group,
} from '@oss-idle/shared/groups';

/** osu!web's group badge: the group's short name in its colour, its full name on hover, leading
 *  to the group page. */
export default function GroupBadge({ group }: { group: Group }) {
	const { short, name, colour } = GROUP_BADGE[group];
	const style = { '--group-colour': colour } as React.CSSProperties;
	return <Link
		to='/groups/$group'
		params={{ group }}
		className='group-badge'
		style={style}
		title={name}
	>{short}</Link>;
}
