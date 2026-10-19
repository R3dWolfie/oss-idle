/** The highest number `!roll [n]` may land on (100 by default, at least 1), or undefined when `text` isn't a roll. */
export const rollMax = (text: string): number | undefined => {
	const [command, arg] = text.trim().split(/\s+/);
	if (command.toLowerCase() !== '!roll') return undefined;
	const n = Number.parseInt(arg ?? '', 10);
	return Number.isNaN(n) ? 100 : Math.min(Math.max(n, 1), Number.MAX_SAFE_INTEGER);
};
