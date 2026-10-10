import { useId } from 'react';
import {
	medalSvg,
	type MedalLook,
} from '@osu-idle/shared/achievements/medal';

type Props = {
	look: MedalLook,
	className?: string,
};

// the svg string is generated from our own medal data, never from user input
export default function MedalBadge({
	look, className,
}: Props) {
	const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
	return <div
		className={`medal-badge ${className ?? ''}`}
		dangerouslySetInnerHTML={{ __html: medalSvg(look, `m${uid}`) }}
	/>;
}
