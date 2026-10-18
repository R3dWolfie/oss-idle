const CHUNK = 64 * 1024;

/** A body that goes out at most `rate` bytes/s. Stops when the client hangs up
 *  (the stream is cancelled, so no further pull). */
export const throttled = (buf: Uint8Array, rate: number): ReadableStream<Uint8Array> => {
	const start = Date.now();
	let sent = 0;
	return new ReadableStream({
		async pull(controller) {
			const due = start + sent / rate * 1000 - Date.now();
			if (due > 0) await new Promise(resolve => setTimeout(resolve, due));
			controller.enqueue(buf.subarray(sent, sent + CHUNK));
			sent += CHUNK;
			if (sent >= buf.length) controller.close();
		},
	});
};
