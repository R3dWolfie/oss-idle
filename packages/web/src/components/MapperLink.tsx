import type { ReactNode } from 'react';
import { osuUserUrl } from '@oss-idle/shared/osu/profile';
import OutLink from './OutLink';

/** A map's mapper, linked to their osu! profile once the set is credited to them. */
export default function MapperLink({ userId, className, children }: {
	userId?: number | null;
	className?: string;
	children: ReactNode;
}) {
	return userId
		? <OutLink href={osuUserUrl(userId)} target='_blank' className={className}>{children}</OutLink>
		: <span className={className}>{children}</span>;
}
