/** osu!'s star-rating colour spectrum, interpolated. */
const STOPS: [stars: number, rgb: [number, number, number]][] = [
	[0.1, [66, 144, 251]],
	[1.5, [79, 192, 255]],
	[2.0, [79, 255, 213]],
	[2.5, [124, 255, 79]],
	[3.3, [246, 240, 92]],
	[4.2, [255, 128, 104]],
	[4.9, [255, 78, 111]],
	[5.8, [198, 69, 184]],
	[6.7, [101, 99, 222]],
	[7.7, [24, 21, 142]],
];

// osu!web's getDiffTextColour past 9 stars
const TEXT_STOPS: typeof STOPS = [
	[9, [246, 240, 92]],
	[9.9, [255, 128, 104]],
	[10.6, [255, 78, 111]],
	[11.5, [198, 69, 184]],
	[12.4, [101, 99, 222]],
];

const interpolate = (stops: typeof STOPS, stars: number): string | undefined => {
	if (stars <= stops[0][0]) return `rgb(${stops[0][1].join(',')})`;
	for (let i = 0; i < stops.length - 1; i++) {
		const [s0, c0] = stops[i];
		const [s1, c1] = stops[i + 1];
		if (stars <= s1) {
			const t = (stars - s0) / (s1 - s0);
			const c = c0.map((v, k) => Math.round(v + (c1[k] - v) * t));
			return `rgb(${c.join(',')})`;
		}
	}
};

export const difficultyColor = (stars: number): string =>
	interpolate(STOPS, stars) ?? '#1a1a2e'; // expert+

/** The star rating's text on its difficultyColor badge, like osu!web's. */
export const difficultyTextColor = (stars: number): string => {
	if (stars < 6.5) return '#000';
	return interpolate(TEXT_STOPS, stars) ?? `rgb(${TEXT_STOPS[TEXT_STOPS.length - 1][1].join(',')})`;
};
