import { audioContext } from './audioContext';
import { effects } from './EffectPlayer';

/** One soft bell note: a sine with a quiet octave on top, struck and left to ring out. */
const note = (at: number, freq: number, level: number) => {
	for (const [mult, share] of [[1, 1], [2, 0.18]] as const) {
		const osc = audioContext.createOscillator();
		osc.type = 'sine';
		osc.frequency.value = freq * mult;
		const gain = audioContext.createGain();
		gain.gain.setValueAtTime(0.0001, at);
		gain.gain.exponentialRampToValueAtTime(level * share, at + 0.008);
		gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
		osc.connect(gain).connect(effects.output);
		osc.start(at);
		osc.stop(at + 0.36);
	}
};

/** Someone mentioned you: two quick rising notes, as a chat ping goes. On the effects volume. */
export const playPing = () => {
	const now = audioContext.currentTime;
	note(now, 880, 0.22);
	note(now + 0.09, 1320, 0.2);
};
