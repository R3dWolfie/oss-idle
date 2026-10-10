import type { MedalTier } from '@osu-idle/shared/achievements/medal';
import { audioContext } from './audioContext';
import { effects } from './EffectPlayer';
import * as synth from './medalSynth';

let bus: ReturnType<typeof synth.makeBus> | undefined;
const live = () => {
	bus ??= synth.makeBus(audioContext, effects.output);
	return {
		bus, t: audioContext.currentTime + 0.01,
	};
};

export const medalWhoosh = () => {
	const { bus, t } = live();
	synth.whoosh(bus, t);
};

export const medalReveal = (tier: MedalTier) => {
	const { bus, t } = live();
	synth.reveal(bus, t, tier);
};

export const medalTick = (index: number, count: number) => {
	const { bus, t } = live();
	synth.tick(bus, t, index, count);
};

export const medalFinale = () => {
	const { bus, t } = live();
	synth.finale(bus, t + 0.35);
};
