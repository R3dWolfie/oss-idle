import { Trans } from '@lingui/react/macro';
import { medalName } from '@oss-idle/shared/display/medals';
import Link from '../Link';

/** The medal name a character wears as its title, in its group's colour like osu!web; its owner's
 *  line leads to the settings. */
export default function CharacterTitle({ title, editable, colour }: {
	title?: string;
	editable: boolean;
	colour?: string;
}) {
	const text = title ? medalName(title) : <Trans>no title</Trans>;
	const style = title && colour ? { color: colour } : undefined;
	if (editable) {
		const className = `character__meta-title ${title ? '' : 'is-empty'}`;
		return <Link to='/settings' className={className} style={style}>
			{text}
		</Link>;
	}
	return title ? <div className='character__meta-title' style={style}>{text}</div> : null;
}
