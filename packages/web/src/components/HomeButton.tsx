import './HomeButton.css';
import type { ReactNode } from 'react';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from './Link';

/** osu!web's giant dashboard button (btn-home), textured with our lanes. */
export default function HomeButton({ to, icon, hue, children }: {
	to: '/download' | '/store';
	icon: IconDefinition;
	hue: number;
	children: ReactNode;
}) {
	return <Link to={to} className='btn-home' style={{ '--colour-h': hue } as React.CSSProperties}>
		<span className='btn-home__text'>{children}</span>
		<FontAwesomeIcon icon={icon} fixedWidth className='btn-home__icon' />
	</Link>;
}
