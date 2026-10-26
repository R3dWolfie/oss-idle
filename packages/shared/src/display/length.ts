import { __ } from '../i18n/translate.js';

const two = (n: number) => n.toString().padStart(2, '0');

/** A length as `mm:ss`, `h:mm:ss` from an hour, and `3d 04:05:06` from a day. */
export const length = (seconds: number): string => {
	const total = Math.floor(seconds);
	const s = total % 60;
	const m = Math.floor(total / 60) % 60;
	const h = Math.floor(total / 3600) % 24;
	const d = Math.floor(total / 86400);
	if (total < 3600) return `${two(Math.floor(total / 60))}:${two(s)}`;
	const hms = `${d ? two(h) : h}:${two(m)}:${two(s)}`;
	return d ? `${__('{d}d', undefined, { d })} ${hms}` : hms;
};
