import { timeStretch } from './timeStretch';

self.onmessage = (e: MessageEvent<{
	channels: Float32Array<ArrayBuffer>[], sampleRate: number, rate: number,
}>) => {
	const { channels, sampleRate, rate } = e.data;
	const out = timeStretch(channels, sampleRate, rate);
	self.postMessage(out, { transfer: out.map(c => c.buffer) });
};
