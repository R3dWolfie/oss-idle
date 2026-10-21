import { desktop } from '@oss-idle/shared/desktop';
import {
	type FrameLimit,
	SETTINGS,
} from '../db/settings';

/** Anything but VSync needs the desktop shell launched without Chromium's vsync
 *  cap, so a cap above the refresh rate (or none) can actually be reached. */
export const wantsUncapped = (limit: FrameLimit) => limit !== 'vsync';

/**
 * Caps every requestAnimationFrame loop in the app to the frame limiter: callbacks
 * queue up and run together on the first native frame once the cap's interval
 * has passed. CSS animations run on the compositor and aren't capped.
 */
export function initFrameLimiter(): void {
	const nativeRaf = window.requestAnimationFrame.bind(window);
	let queue = new Map<number, FrameRequestCallback>();
	let nextId = 1;
	let scheduled = false;
	let last = 0;

	const pump = (now: number) => {
		const limit = SETTINGS.frameLimiter.get();
		const interval = typeof limit === 'number' ? 1000 / limit : 0;
		const wait = interval - (now - last);
		// waited on a timer: with vsync lifted a native frame comes back at once,
		// so spinning on them renders the page flat out between capped frames
		if (wait > 1) {
			setTimeout(() => nativeRaf(pump), wait);
			return;
		}
		// keep the cap's cadence through jitter, without bursting after a stall
		last = Math.max(last + interval, now - interval);
		scheduled = false;
		const run = queue;
		queue = new Map();
		for (const callback of run.values()) {
			try { callback(now); } catch (e) { reportError(e); }
		}
	};

	window.requestAnimationFrame = callback => {
		const id = nextId++;
		queue.set(id, callback);
		if (!scheduled) {
			scheduled = true;
			nativeRaf(pump);
		}
		return id;
	};
	window.cancelAnimationFrame = id => { queue.delete(id); };

	SETTINGS.frameLimiter.forceSync(limit => desktop()?.frameRate.setUncapped(wantsUncapped(limit)));
}
