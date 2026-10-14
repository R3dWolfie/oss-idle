import type {
	CSSProperties,
	ReactNode,
} from 'react';

const row: CSSProperties = {
	display: 'flex',
	justifyContent: 'space-between',
	gap: '0.75rem',
};
// only the labels are dimmed: the values keep their colours
const dim: CSSProperties = { color: 'rgba(255, 255, 255, 0.55)' };

/** One label / value line of a HoverCard. */
export default function HoverCardRow({
	label,
	children,
}: {
	label: ReactNode,
	children: ReactNode,
}) {
	return <span style={row}><span style={dim}>{label}</span><span>{children}</span></span>;
}
