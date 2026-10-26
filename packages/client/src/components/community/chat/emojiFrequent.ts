export const FREQUENT_SHOWN = 16;

/** Your most used emoji ids (from id → times used), most first. */
export const frequentIds = (uses: Record<string, number>): number[] =>
	Object.entries(uses).sort((a, b) => b[1] - a[1]).slice(0, FREQUENT_SHOWN).map(([id]) => Number(id));
