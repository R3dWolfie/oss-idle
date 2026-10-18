/**
 * The WAV samples osu! plays but decodeAudioData rejects: empty files (mappers
 * use them to mute a hitsound), MS / IMA ADPCM, and Ogg Vorbis wrapped in a WAV.
 */

export type Pcm = { rate: number, channels: Float32Array<ArrayBuffer>[] };

type Fmt = { tag: number, channels: number, rate: number, blockAlign: number, extra: DataView };

const SILENCE: Pcm = {
	rate: 44100, channels: [new Float32Array(1)], 
};

const MS_ADPCM = 0x0002;
const IMA_ADPCM = 0x0011;

/**
 * Decoded PCM, or an inner stream decodeAudioData can take, for a sample the
 * browser can't decode as-is; undefined for anything it can.
 */
export function unwrapWav(bytes: ArrayBuffer): Pcm | Uint8Array | undefined {
	if (bytes.byteLength === 0) return SILENCE;
	const view = new DataView(bytes);
	if (bytes.byteLength < 12 || tag(view, 0) !== 'RIFF' || tag(view, 8) !== 'WAVE') return undefined;
	const { fmt, data } = chunks(view);
	if (!fmt || !data) return undefined;
	if (data.length === 0) return SILENCE;
	if (String.fromCharCode(...data.subarray(0, 4)) === 'OggS') return data;
	if (fmt.channels === 0 || fmt.blockAlign === 0) return undefined;
	if (fmt.tag === MS_ADPCM) return {
		rate: fmt.rate, channels: decodeMsAdpcm(data, fmt), 
	};
	if (fmt.tag === IMA_ADPCM) return {
		rate: fmt.rate, channels: decodeImaAdpcm(data, fmt), 
	};
	return undefined;
}

const tag = (view: DataView, at: number): string =>
	at + 4 > view.byteLength ? '' : String.fromCharCode(
		view.getUint8(at), view.getUint8(at + 1), view.getUint8(at + 2), view.getUint8(at + 3),
	);

function chunks(view: DataView): { fmt?: Fmt, data?: Uint8Array } {
	let fmt: Fmt | undefined;
	for (let at = 12; at + 8 <= view.byteLength;) {
		const id = tag(view, at);
		const size = view.getUint32(at + 4, true);
		const body = at + 8;
		if (id === 'fmt ' && size >= 16) fmt = {
			tag: view.getUint16(body, true),
			channels: view.getUint16(body + 2, true),
			rate: view.getUint32(body + 4, true),
			blockAlign: view.getUint16(body + 12, true),
			extra: new DataView(view.buffer, body + 16, Math.min(size, view.byteLength - body) - 16),
		};
		if (id === 'data') {
			const end = Math.min(body + size, view.byteLength);
			return {
				fmt, data: new Uint8Array(view.buffer, body, end - body), 
			};
		}
		at = body + size + (size & 1);
	}
	return { fmt };
}

const clamp16 = (v: number): number => Math.max(-32768, Math.min(32767, v));

/** One Float32Array per channel, trimmed to the frames actually decoded. */
function decodeBlocks(
	data: Uint8Array,
	fmt: Fmt,
	framesPerBlock: number,
	decodeBlock: (block: DataView, out: Float32Array<ArrayBuffer>[], at: number) => number,
): Float32Array<ArrayBuffer>[] {
	const blocks = Math.ceil(data.length / fmt.blockAlign);
	const out = Array.from({ length: fmt.channels }, () => new Float32Array(blocks * framesPerBlock));
	let frames = 0;
	for (let at = 0; at < data.length; at += fmt.blockAlign) {
		const size = Math.min(fmt.blockAlign, data.length - at);
		frames += decodeBlock(new DataView(data.buffer, data.byteOffset + at, size), out, frames);
	}
	return out.map((c) => c.slice(0, Math.max(1, frames)));
}

const MS_ADAPT = [230, 230, 230, 230, 307, 409, 512, 614, 768, 614, 512, 409, 307, 230, 230, 230];
const MS_COEFS = [[256, 0], [512, -256], [0, 0], [192, 64], [240, 0], [460, -208], [392, -232]];

function msCoefs(extra: DataView): number[][] {
	if (extra.byteLength < 6) return MS_COEFS;
	const count = extra.getUint16(4, true);
	if (count === 0 || extra.byteLength < 6 + count * 4) return MS_COEFS;
	return Array.from({ length: count }, (_, i) =>
		[extra.getInt16(6 + i * 4, true), extra.getInt16(8 + i * 4, true)]);
}

function decodeMsAdpcm(data: Uint8Array, fmt: Fmt): Float32Array<ArrayBuffer>[] {
	const ch = fmt.channels;
	const coefs = msCoefs(fmt.extra);
	const framesPerBlock = (fmt.blockAlign - 7 * ch) * 2 / ch + 2;
	return decodeBlocks(data, fmt, framesPerBlock, (block, out, at) => {
		if (block.byteLength < 7 * ch) return 0;
		const coef = [], delta = [], s1 = [], s2 = [];
		for (let c = 0; c < ch; c++) {
			coef.push(coefs[Math.min(block.getUint8(c), coefs.length - 1)]);
			delta.push(block.getInt16(ch + c * 2, true));
			s1.push(block.getInt16(3 * ch + c * 2, true));
			s2.push(block.getInt16(5 * ch + c * 2, true));
			out[c][at] = s2[c] / 32768;
			out[c][at + 1] = s1[c] / 32768;
		}
		const nibbles = (block.byteLength - 7 * ch) * 2;
		for (let i = 0; i < nibbles; i++) {
			const c = i % ch;
			const byte = block.getUint8(7 * ch + (i >> 1));
			const n = i & 1 ? byte & 0x0f : byte >> 4;
			const predicted = Math.trunc((s1[c] * coef[c][0] + s2[c] * coef[c][1]) / 256);
			const sample = clamp16(predicted + (n & 8 ? n - 16 : n) * delta[c]);
			s2[c] = s1[c];
			s1[c] = sample;
			delta[c] = Math.max(16, (MS_ADAPT[n] * delta[c]) >> 8);
			out[c][at + 2 + Math.floor(i / ch)] = sample / 32768;
		}
		return 2 + Math.floor(nibbles / ch);
	});
}

const IMA_STEP = [
	7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80,
	88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494, 544,
	598, 658, 724, 796, 876, 963, 1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749,
	3024, 3327, 3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487, 12635,
	13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767,
];
const IMA_INDEX = [-1, -1, -1, -1, 2, 4, 6, 8];

function decodeImaAdpcm(data: Uint8Array, fmt: Fmt): Float32Array<ArrayBuffer>[] {
	const ch = fmt.channels;
	const framesPerBlock = (fmt.blockAlign - 4 * ch) * 2 / ch + 1;
	return decodeBlocks(data, fmt, framesPerBlock, (block, out, at) => {
		if (block.byteLength < 4 * ch) return 0;
		const sample = [], index = [];
		for (let c = 0; c < ch; c++) {
			sample.push(block.getInt16(c * 4, true));
			index.push(Math.min(88, block.getUint8(c * 4 + 2)));
			out[c][at] = sample[c] / 32768;
		}
		// 4 bytes (8 frames) per channel at a time, low nibble first
		const groups = Math.floor((block.byteLength - 4 * ch) / (4 * ch));
		for (let g = 0; g < groups; g++) for (let c = 0; c < ch; c++) for (let k = 0; k < 8; k++) {
			const byte = block.getUint8(4 * ch + (g * ch + c) * 4 + (k >> 1));
			const n = k & 1 ? byte >> 4 : byte & 0x0f;
			const diff = ((2 * (n & 7) + 1) * IMA_STEP[index[c]]) >> 3;
			sample[c] = clamp16(n & 8 ? sample[c] - diff : sample[c] + diff);
			index[c] = Math.max(0, Math.min(88, index[c] + IMA_INDEX[n & 7]));
			out[c][at + 1 + g * 8 + k] = sample[c] / 32768;
		}
		return 1 + groups * 8;
	});
}
