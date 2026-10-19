import { useId } from 'react';
import {
	medalSvg,
	type MedalLook,
} from '@oss-idle/shared/achievements/medal';
import './MedalIcon.css';

// the svg string is generated from our own medal data, never from user input
export default function MedalIcon({ look }: { look: MedalLook }) {
	const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
	return <span
		className='medal-icon'
		dangerouslySetInnerHTML={{ __html: medalSvg(look, `w${uid}`) }}
	/>;
}
