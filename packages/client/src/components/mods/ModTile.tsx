import Glyph from '../multiplayer/Glyph';
import type { GlyphName } from '@oss-idle/shared/achievements/glyphs';

/** One mod on the mod select screen: lit while it's on. */
export default function ModTile({ glyph, label, on, disabled, tint, title, onClick }: {
	glyph: GlyphName,
	label: string,
	on: boolean,
	disabled: boolean,
	tint: string,
	title?: string,
	onClick: () => void,
}) {
	return (
		<button
			type="button"
			className={`mod-tile ${on ? 'is-on' : ''}`}
			style={{ '--tint': tint } as React.CSSProperties}
			disabled={disabled}
			title={title}
			onClick={onClick}
		>
			<Glyph name={glyph} className="mod-tile__glyph" />
			<span className="mod-tile__label">{label}</span>
		</button>
	);
}
