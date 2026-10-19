import {
	GLYPHS,
	type GlyphName,
} from '@oss-idle/shared/achievements/glyphs';

export default function Glyph({ name, className }: { name: GlyphName, className?: string }) {
	return (
		<svg className={className} viewBox="0 0 256 256" fill="currentColor" aria-hidden>
			<path d={GLYPHS[name]} />
		</svg>
	);
}
