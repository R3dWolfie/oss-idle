import type { MedalTier } from '@oss-idle/shared/achievements/medal';

/**
 * Medal unlock sounds, synthesised. Pure scheduling over any BaseAudioContext,
 * so the same code plays live and renders offline. Times are in seconds on the
 * context clock.
 */

const midi = (note: number) => 440 * Math.pow(2, (note - 69) / 12);

// E major, so every tier and the cascade ticks sit in one key
const E5 = 76;
/** a strummed chord per tier, fuller as it climbs (root, fifth, octave, third, seventh) */
const TIER_NOTES: Record<MedalTier, number[]> = {
	bronze: [E5, E5 + 7, E5 + 12],
	silver: [E5, E5 + 4, E5 + 7, E5 + 12],
	gold: [E5, E5 + 4, E5 + 7, E5 + 12, E5 + 16],
	platinum: [E5, E5 + 7, E5 + 11, E5 + 12, E5 + 16, E5 + 19],
	divine: [E5 + 12, E5 + 16, E5 + 19, E5 + 23, E5 + 24, E5 + 28],
};
/** the low root under each tier, for depth */
const TIER_SUB: Record<MedalTier, number> = {
	bronze: E5 - 24,
	silver: E5 - 24,
	gold: E5 - 36,
	platinum: E5 - 36,
	divine: E5 - 36,
};
const PENTATONIC = [0, 2, 4, 7, 9];
/** a few dB under a reveal: they come every 250 ms, over the reveals' tails */
const TICK_GAIN = 0.75;

/** inharmonic bell partials: ratio, amplitude, decay factor */
const BELL = [
	[1, 1, 1],
	[2, 0.45, 0.7],
	[2.76, 0.32, 0.5],
	[5.4, 0.16, 0.3],
	[8.93, 0.08, 0.2],
] as const;

type Bus = { ctx: BaseAudioContext, dry: AudioNode, wet: AudioNode };

const impulses = new WeakMap<BaseAudioContext, AudioBuffer>();
const impulse = (ctx: BaseAudioContext) => {
	const cached = impulses.get(ctx);
	if (cached) return cached;
	const length = Math.floor(ctx.sampleRate * 3.4);
	const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
	for (let c = 0; c < 2; c++) {
		const data = buffer.getChannelData(c);
		for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
	}
	impulses.set(ctx, buffer);
	return buffer;
};

/** A dry + reverb send into `destination`, through a limiter: impacts and
 *  bells stacking on reverb tails would otherwise clip. */
export const makeBus = (ctx: BaseAudioContext, destination: AudioNode): Bus => {
	const limiter = ctx.createDynamicsCompressor();
	limiter.threshold.value = -6;
	limiter.knee.value = 3;
	limiter.ratio.value = 20;
	limiter.attack.value = 0.002;
	limiter.release.value = 0.2;
	limiter.connect(destination);
	const dry = ctx.createGain();
	dry.gain.value = 0.8;
	dry.connect(limiter);
	const reverb = ctx.createConvolver();
	reverb.buffer = impulse(ctx);
	const wet = ctx.createGain();
	wet.gain.value = 0.45;
	wet.connect(reverb);
	reverb.connect(limiter);
	return {
		ctx, dry, wet,
	};
};

const envelope = (bus: Bus, t: number, peak: number, decay: number, wet = true) => {
	const gain = bus.ctx.createGain();
	gain.gain.setValueAtTime(0, t);
	gain.gain.linearRampToValueAtTime(peak, t + 0.004);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
	gain.connect(bus.dry);
	if (wet) gain.connect(bus.wet);
	return gain;
};

const tone = (
	bus: Bus, t: number, freq: number, type: OscillatorType, peak: number, decay: number,
) => {
	const osc = bus.ctx.createOscillator();
	osc.type = type;
	osc.frequency.value = freq;
	osc.connect(envelope(bus, t, peak, decay));
	osc.start(t);
	osc.stop(t + decay + 0.05);
};

/** `shimmer` adds a hair-detuned twin per partial: richer, twice the voices -
 *  left off for the ticks, which can come 14 a second. */
const bell = (bus: Bus, t: number, freq: number, peak: number, decay = 2.2, shimmer = true) => {
	for (const [ratio, amp, fade] of BELL) {
		tone(bus, t, freq * ratio, 'sine', peak * amp, decay * fade);
		if (shimmer) tone(bus, t, freq * ratio * 1.003, 'sine', peak * amp * 0.5, decay * fade);
	}
};

const noise = (ctx: BaseAudioContext, seconds: number) => {
	const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
	const src = ctx.createBufferSource();
	src.buffer = buffer;
	return src;
};

export const whoosh = (bus: Bus, t: number, length = 0.5) => {
	const src = noise(bus.ctx, length);
	const filter = bus.ctx.createBiquadFilter();
	filter.type = 'bandpass';
	filter.Q.value = 1.4;
	filter.frequency.setValueAtTime(250, t);
	filter.frequency.exponentialRampToValueAtTime(5000, t + length);
	const gain = bus.ctx.createGain();
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(0.5, t + length * 0.8);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
	src.connect(filter).connect(gain).connect(bus.dry);
	src.start(t);
};

const thump = (bus: Bus, t: number, peak = 0.9) => {
	const osc = bus.ctx.createOscillator();
	osc.frequency.setValueAtTime(150, t);
	osc.frequency.exponentialRampToValueAtTime(42, t + 0.3);
	osc.connect(envelope(bus, t, peak, 0.45, false));
	osc.start(t);
	osc.stop(t + 0.5);
};

const pad = (bus: Bus, t: number, notes: number[], length: number) => {
	const filter = bus.ctx.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.setValueAtTime(300, t);
	filter.frequency.exponentialRampToValueAtTime(2800, t + length * 0.5);
	const gain = bus.ctx.createGain();
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(0.12, t + length * 0.35);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
	filter.connect(gain);
	gain.connect(bus.dry);
	gain.connect(bus.wet);
	for (const note of notes) {
		for (const detune of [-8, 8]) {
			const osc = bus.ctx.createOscillator();
			osc.type = 'sawtooth';
			osc.frequency.value = midi(note);
			osc.detune.value = detune;
			osc.connect(filter);
			osc.start(t);
			osc.stop(t + length + 0.05);
		}
	}
};

/** A soft low sine under a sound: what makes it feel deep, not just bright. */
const subBass = (bus: Bus, t: number, note: number, peak: number, decay: number) => {
	const osc = bus.ctx.createOscillator();
	osc.frequency.value = midi(note);
	const gain = bus.ctx.createGain();
	gain.gain.setValueAtTime(0, t);
	gain.gain.linearRampToValueAtTime(peak, t + 0.03);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
	osc.connect(gain);
	gain.connect(bus.dry);
	gain.connect(bus.wet);
	osc.start(t);
	osc.stop(t + decay + 0.05);
};

/** The medal lands: an impact, then the tier's bells. */
export const reveal = (bus: Bus, t: number, tier: MedalTier) => {
	thump(bus, t);
	subBass(bus, t, TIER_SUB[tier], 0.35, 1.8);
	subBass(bus, t, TIER_SUB[tier] + 12, 0.18, 1.4);
	const notes = TIER_NOTES[tier];
	const peak = 0.26 / Math.sqrt(notes.length);
	notes.forEach((note, i) => bell(bus, t + i * 0.045, midi(note), peak, 2.8));
	if (tier !== 'bronze' && tier !== 'silver') {
		pad(bus, t, [E5 - 24, E5 - 17, E5 - 12, E5 - 8], tier === 'divine' ? 3.5 : 2);
	}
};

/** One medal popping into the cascade grid; pitch climbs with `index`. */
export const tick = (bus: Bus, t: number, index: number, count: number) => {
	const step = Math.round(index / Math.max(1, count - 1) * 10);
	const note = E5 + 12 * Math.floor(step / 5) + PENTATONIC[step % 5] - 12;
	tone(bus, t, midi(note), 'triangle', TICK_GAIN, 0.35);
	bell(bus, t, midi(note + 12), TICK_GAIN / 3, 1.1, false);
	bell(bus, t + 0.02, midi(note + 19), TICK_GAIN / 5, 0.9, false);
	// short and light: at full speed longer ones overlap into a rumble
	subBass(bus, t, note - 24, TICK_GAIN / 8, 0.22);
};

/** The cascade's last beat, before the spotlight on the best medals. */
export const finale = (bus: Bus, t: number) => {
	thump(bus, t, 1);
	whoosh(bus, t - 0.35, 0.35);
	subBass(bus, t, E5 - 36, 0.4, 2.6);
	subBass(bus, t, E5 - 24, 0.2, 2.2);
	[E5, E5 + 4, E5 + 7, E5 + 11, E5 + 12, E5 + 16, E5 + 19]
		.forEach((note, i) => bell(bus, t + i * 0.055, midi(note), 0.11, 3.2));
	pad(bus, t, [E5 - 24, E5 - 12, E5 - 5, E5 - 8, E5 - 1], 4);
};
