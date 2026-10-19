import {
	medalSvg,
	type MedalLook,
} from '@oss-idle/shared/achievements/medal';

/** px of the cached bitmap: crisp at the biggest a medal is shown */
const SIZE = 320;
/** room around the medal for the baked glow */
const PAD = 0.14;

const TIER_GLOW: Record<MedalLook['tier'], string> = {
	bronze: 'rgba(227, 154, 95, 0.55)',
	silver: 'rgba(223, 230, 238, 0.5)',
	gold: 'rgba(255, 211, 90, 0.6)',
	platinum: 'rgba(166, 232, 255, 0.6)',
	divine: 'rgba(227, 168, 255, 0.7)',
};

const cache = new Map<string, Promise<string>>();

export const lookKey = (look: MedalLook) => `${look.shape}-${look.tier}-${look.hue}-${look.glyph}`;

const loadSvg = async (look: MedalLook) => {
	const img = new Image();
	img.src = `data:image/svg+xml,${encodeURIComponent(medalSvg(look, 'b'))}`;
	await img.decode();
	return img;
};

/**
 * A medal drawn once into a bitmap, shadow and glow included, as an object URL.
 * Vector medals with filters get re-rasterised every time they move or scale -
 * dozens of them at once is what made a big unlock lag.
 */
const render = async (look: MedalLook): Promise<string> => {
	const svg = await loadSvg(look);
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = SIZE;
	const ctx = canvas.getContext('2d')!;
	const inset = SIZE * PAD;
	const side = SIZE - inset * 2;
	ctx.shadowColor = TIER_GLOW[look.tier];
	ctx.shadowBlur = SIZE * 0.08;
	ctx.drawImage(svg, inset, inset, side, side);
	ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
	ctx.shadowBlur = SIZE * 0.04;
	ctx.shadowOffsetY = SIZE * 0.02;
	ctx.drawImage(svg, inset, inset, side, side);
	const blob = await new Promise<Blob | null>(done => canvas.toBlob(done));
	if (!blob) throw new Error('medal bitmap failed');
	const url = URL.createObjectURL(blob);
	const decoded = new Image();
	decoded.src = url;
	await decoded.decode();
	return url;
};

/** Bitmaps for every look, cached for the session; resolves once all are decoded. */
export const medalBitmaps = async (looks: MedalLook[]): Promise<Map<string, string>> => {
	const keys = [...new Set(looks.map(lookKey))];
	const urls = await Promise.all(keys.map(key => {
		if (!cache.has(key)) cache.set(key, render(looks.find(l => lookKey(l) === key)!));
		return cache.get(key)!;
	}));
	return new Map(keys.map((key, i) => [key, urls[i]]));
};

/** Fraction of the bitmap the medal itself fills (the rest is glow). */
export const MEDAL_FILL = 1 - PAD * 2;
