import { timeStretch } from './timeStretch';

const inWorker = (channels: Float32Array<ArrayBuffer>[], sampleRate: number, rate: number) =>
	new Promise<Float32Array<ArrayBuffer>[]>((resolve, reject) => {
		const worker = new Worker(new URL('./timeStretch.worker.ts', import.meta.url), { type: 'module' });
		worker.onmessage = (e: MessageEvent<Float32Array<ArrayBuffer>[]>) => {
			worker.terminate();
			resolve(e.data);
		};
		worker.onerror = e => {
			worker.terminate();
			reject(e);
		};
		worker.postMessage({
			channels, sampleRate, rate,
		}, channels.map(c => c.buffer));
	});

/** The track `rate` times faster at its own pitch. Off the main thread when the
 *  page can start a worker, so the lead-in keeps drawing. */
export const stretchBuffer = async (
	context: BaseAudioContext, buffer: AudioBuffer, rate: number,
): Promise<AudioBuffer> => {
	const copy = () => Array.from(
		{ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c).slice(),
	);
	const channels = await inWorker(copy(), buffer.sampleRate, rate)
		.catch(() => timeStretch(copy(), buffer.sampleRate, rate));
	const out = context.createBuffer(channels.length, channels[0].length, buffer.sampleRate);
	channels.forEach((ch, c) => out.copyToChannel(ch, c));
	return out;
};
