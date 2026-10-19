/**
 * Speed audio up or down without changing its pitch (WSOLA, as SoundTouch does).
 *
 * The input is cut into overlapping pieces. Each piece is taken a little ahead of
 * or behind where the speed alone would put it, at the spot that lines up best
 * with the end of the previous one, then cross-faded into it. Lining the waves up
 * is what keeps it from sounding phasey or clicky.
 */

const SEQUENCE_MS = 82;
const OVERLAP_MS = 12;
const SEEK_MS = 28;
/** coarse step of the search before refining around the best match */
const SEEK_STEP = 4;

/** Mono mix, only used to find where pieces line up. */
const mixDown = (channels: Float32Array[]): Float32Array => {
	if (channels.length === 1) return channels[0];
	const mono = new Float32Array(channels[0].length);
	for (const ch of channels) for (let i = 0; i < mono.length; i++) mono[i] += ch[i] / channels.length;
	return mono;
};

/** How well the input at `at` matches the overlap kept from the last piece. */
const similarity = (mono: Float32Array, at: number, tail: Float32Array): number => {
	let dot = 0;
	let energy = 1e-9;
	for (let i = 0; i < tail.length; i += 2) {
		const v = mono[at + i];
		dot += v * tail[i];
		energy += v * v;
	}
	return dot / Math.sqrt(energy);
};

const bestOffset = (mono: Float32Array, from: number, seek: number, tail: Float32Array): number => {
	// silence matches everywhere: start at the centre so ties stay on time
	let best = seek >> 1;
	let bestScore = similarity(mono, from + best, tail);
	for (let k = 0; k < seek; k += SEEK_STEP) {
		const score = similarity(mono, from + k, tail);
		if (score > bestScore) [best, bestScore] = [k, score];
	}
	const coarse = best;
	for (let k = Math.max(0, coarse - SEEK_STEP + 1); k < Math.min(seek, coarse + SEEK_STEP); k++) {
		const score = similarity(mono, from + k, tail);
		if (score > bestScore) [best, bestScore] = [k, score];
	}
	return best;
};

/** `channels` played `rate` times faster, same pitch. */
export const timeStretch = (
	channels: Float32Array<ArrayBuffer>[], sampleRate: number, rate: number,
): Float32Array<ArrayBuffer>[] => {
	if (rate === 1) return channels;
	const length = channels[0].length;
	const sequence = Math.round(SEQUENCE_MS * sampleRate / 1000);
	const overlap = Math.round(OVERLAP_MS * sampleRate / 1000);
	const seek = Math.round(SEEK_MS * sampleRate / 1000);
	const hop = sequence - overlap;
	const mono = mixDown(channels);
	// a piece is copied at 1x, so read it from where its middle belongs, and
	// centre the search on that, or the output drifts ahead (worst slowed down)
	const bias = (rate - 1) * hop / 2 - seek / 2;

	const out = channels.map(() => new Float32Array(Math.ceil(length / rate) + sequence));
	let written = 0;
	// the overlap the next piece fades in over, per channel and mixed down
	let tails = channels.map(ch => ch.slice(0, overlap));
	let monoTail = mono.slice(0, overlap);

	for (let nominal = bias; nominal + seek + sequence < length; nominal += rate * hop) {
		const from = Math.max(0, Math.floor(nominal));
		const start = from + bestOffset(mono, from, seek, monoTail);
		channels.forEach((ch, c) => {
			const o = out[c];
			const tail = tails[c];
			for (let i = 0; i < overlap; i++) {
				const fade = i / overlap;
				o[written + i] = tail[i] * (1 - fade) + ch[start + i] * fade;
			}
			o.set(ch.subarray(start + overlap, start + hop), written + overlap);
		});
		written += hop;
		tails = channels.map(ch => ch.slice(start + hop, start + hop + overlap));
		monoTail = mono.slice(start + hop, start + hop + overlap);
	}
	return out.map(o => o.subarray(0, written));
};
