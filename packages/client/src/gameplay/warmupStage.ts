export type WarmupStage = 'cold' | 'warming' | 'warm' | 'peak' | 'pushing' | 'tired';

/** where the character is on its warm-up curve */
export const warmupStage = (warm: number, cooling = false): WarmupStage => {
	if (cooling) return warm < 0.5 ? 'tired' : 'pushing';
	if (warm < 0.25) return 'cold';
	if (warm < 0.75) return 'warming';
	return warm < 0.995 ? 'warm' : 'peak';
};
