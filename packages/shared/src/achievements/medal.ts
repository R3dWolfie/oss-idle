import {
	GLYPHS,
	type GlyphName,
} from './glyphs.js';

export const MedalTiers = ['bronze', 'silver', 'gold', 'platinum', 'divine'] as const;
export type MedalTier = (typeof MedalTiers)[number];

export const MedalShapes = ['hexagon', 'circle', 'octagon', 'diamond'] as const;
export type MedalShape = (typeof MedalShapes)[number];

export type MedalLook = {
	shape: MedalShape,
	tier: MedalTier,
	/** inner colour, 0-360 */
	hue: number,
	glyph: GlyphName,
};

/** rim gradient: highlight, body, shadow */
const RIMS: Record<MedalTier, [string, string, string]> = {
	bronze: ['#f3c49b', '#b06a35', '#5e3216'],
	silver: ['#ffffff', '#a9b3bf', '#4e5763'],
	gold: ['#fff2b0', '#e2a72c', '#7a4b07'],
	platinum: ['#ffffff', '#b8e8ff', '#3c7d9e'],
	divine: ['#ffe9ff', '#d48cff', '#4b1a8c'],
};

const polygon = (sides: number, r: number, rotation: number) => Array
	.from({ length: sides }, (_, i) => {
		const a = (rotation + i * 360 / sides) * Math.PI / 180;
		return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
	})
	.join(' ');

const SHAPES: Record<MedalShape, (r: number) => string> = {
	hexagon: r => `<polygon points="${polygon(6, r, -90)}"/>`,
	circle: r => `<circle cx="50" cy="50" r="${r}"/>`,
	octagon: r => `<polygon points="${polygon(8, r, -67.5)}"/>`,
	diamond: r => `<polygon points="${polygon(4, r * 1.08, -90)}"/>`,
};

const GLYPH_SIZE = 40;
const GLYPH_GRID = 256;

/**
 * A medal as an SVG string, drawn on a 100x100 viewBox. `uid` keeps the
 * gradient/filter ids unique when several medals share a page.
 */
export const medalSvg = ({
	shape, tier, hue, glyph,
}: MedalLook, uid: string): string => {
	const [hi, mid, lo] = RIMS[tier];
	const s = SHAPES[shape];
	const scale = GLYPH_SIZE / GLYPH_GRID;
	const offset = 50 - GLYPH_SIZE / 2;
	const stop = (offset: string, color: string) => `<stop offset="${offset}" stop-color="${color}"/>`;
	const rim = [stop('0', hi), stop('.45', mid), stop('.55', lo), stop('1', mid)].join('');
	const face = stop('0', `hsl(${hue} 70% 55%)`) + stop('1', `hsl(${hue} 60% 16%)`);
	const glyphFill = stop('0', '#fff') + stop('1', `hsl(${hue} 80% 88%)`);
	const shadow = '<feDropShadow dx="0" dy="1.5" stdDeviation="1.5"'
		+ ` flood-color="hsl(${hue} 80% 8%)" flood-opacity=".8"/>`;
	const glyphPath = `<path transform="translate(${offset} ${offset}) scale(${scale})"`
		+ ` d="${GLYPHS[glyph]}"/>`;
	return [
		'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>',
		`<linearGradient id="${uid}r" x1="0" y1="0" x2="1" y2="1">${rim}</linearGradient>`,
		`<radialGradient id="${uid}f" cx=".5" cy=".35" r=".75">${face}</radialGradient>`,
		`<linearGradient id="${uid}g" x1="0" y1="0" x2="0" y2="1">${glyphFill}</linearGradient>`,
		`<filter id="${uid}s">${shadow}</filter>`,
		`<clipPath id="${uid}c">${s(38)}</clipPath>`,
		'</defs>',
		`<g fill="url(#${uid}r)">${s(47)}</g>`,
		`<g fill="url(#${uid}f)">${s(38)}</g>`,
		`<g clip-path="url(#${uid}c)">`,
		'<ellipse cx="50" cy="18" rx="44" ry="26" fill="#fff" opacity=".12"/></g>',
		`<g fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1">${s(36.5)}</g>`,
		`<g filter="url(#${uid}s)" fill="url(#${uid}g)">${glyphPath}</g>`,
		'</svg>',
	].join('');
};
