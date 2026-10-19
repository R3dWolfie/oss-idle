import {
	useState,
	type CSSProperties,
	type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

const style: CSSProperties = {
	position: 'fixed',
	display: 'flex',
	flexDirection: 'column',
	// above the client's page overlay (5000), which the upgrades panel opens in
	zIndex: 5200,
	pointerEvents: 'none',
	padding: '0.4rem 0.6rem',
	borderRadius: 6,
	background: 'rgba(0, 0, 0, 0.85)',
	border: '1px solid rgba(255, 255, 255, 0.1)',
	boxShadow: '0 6px 18px rgba(0, 0, 0, 0.5)',
	fontSize: '0.75rem',
	fontWeight: 400,
	lineHeight: 1.6,
	whiteSpace: 'nowrap',
	textAlign: 'left',
};

/** Gap between the anchor and its card. */
const GAP_PX = 6;
/** Room needed above the anchor before the card is flipped under it. */
const FLIP_BELOW_PX = 120;

/**
 * A small card shown over its anchor while hovered. Portalled to the body so a
 * scroll container cannot clip it, which means it is placed by hand.
 */
export default function HoverCard({
	card,
	children,
	className,
}: {
	/** nothing hovers when undefined */
	card: ReactNode,
	children: ReactNode,
	className?: string,
}) {
	const [at, setAt] = useState<DOMRect | undefined>(undefined);
	// flipped under the anchor when there is no room for it above
	const below = at !== undefined && at.top < FLIP_BELOW_PX;

	return <span
		className={className}
		// a tap would open it with nothing to close it
		onPointerEnter={e => e.pointerType !== 'touch' && setAt(e.currentTarget.getBoundingClientRect())}
		onPointerLeave={() => setAt(undefined)}
	>
		{children}
		{at !== undefined && card !== undefined && typeof document !== 'undefined' && createPortal(
			<span style={{
				...style,
				left: at.left + at.width / 2,
				top: below ? at.bottom + GAP_PX : at.top - GAP_PX,
				transform: `translate(-50%, ${below ? '0' : '-100%'})`,
			}}>
				{card}
			</span>,
			document.body,
		)}
	</span>;
}
