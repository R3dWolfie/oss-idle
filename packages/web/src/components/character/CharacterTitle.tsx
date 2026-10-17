import { Trans } from '@lingui/react/macro';
import { medalName } from '@osu-idle/shared/display/medals';
import Link from '../Link';

/** The medal name a character wears as its title; its owner's line leads to the settings. */
export default function CharacterTitle({ title, editable }: {
	title?: string;
	editable: boolean;
}) {
	const text = title ? medalName(title) : <Trans>no title</Trans>;
	if (editable) {
		return <Link to='/settings' className={`character__meta-title ${title ? '' : 'is-empty'}`}>
			{text}
		</Link>;
	}
	return title ? <div className='character__meta-title'>{text}</div> : null;
}
