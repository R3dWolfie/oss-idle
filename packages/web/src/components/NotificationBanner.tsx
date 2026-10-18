import './NotificationBanner.css';
import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamation } from '@fortawesome/free-solid-svg-icons/faExclamation';

/** osu!web's notification banner: an icon, a type and title, then the message. */
export default function NotificationBanner({ type, title, children }: {
	type: string;
	title: ReactNode;
	children: ReactNode;
}) {
	return <div className='notification-banner'>
		<div className='notification-banner__icon'><FontAwesomeIcon icon={faExclamation} /></div>
		<div className='notification-banner__label'>
			<div className='notification-banner__type'>{type}</div>
			<div>{title}</div>
		</div>
		<div className='notification-banner__text'>{children}</div>
	</div>;
}
