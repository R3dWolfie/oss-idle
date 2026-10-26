import type { RefObject } from 'react';
import { createPortal } from 'react-dom';

import type { PresenceEntry } from '@oss-idle/shared/community/presence';
import useSynced from '@oss-idle/shared/hooks/useSynced';

import Auth from '../../../online/auth';
import {
	friends,
	mutuals,
} from '../../../online/friends';
import NameCard from './NameCard';

/** A sender's {@link NameCard} over the page, at `at`. */
export default function NameCardPopup({
	p, offline, color, bannerUrl, at, cardRef, onMouseEnter, onMouseLeave,
}: {
	p: PresenceEntry,
	offline: boolean,
	color?: string,
	bannerUrl?: string,
	at: { left: number, top: number },
	cardRef: RefObject<HTMLDivElement>,
	onMouseEnter: () => void,
	onMouseLeave: () => void,
}) {
	const [user] = useSynced(Auth.user);
	const [friendIds] = useSynced(friends);
	const [mutualIds] = useSynced(mutuals);
	const friendship = user && user.id !== p.userId ? {
		friend: friendIds.has(p.userId), mutual: mutualIds.has(p.userId),
	} : undefined;
	return createPortal(
		<div
			ref={cardRef}
			className="name-card"
			style={at}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			<NameCard p={p} offline={offline} color={color} bannerUrl={bannerUrl} friendship={friendship} />
		</div>,
		document.body,
	);
}
