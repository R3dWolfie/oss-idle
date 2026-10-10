import type { GlyphName } from './glyphs.js';
import type {
	MedalLook,
	MedalShape,
	MedalTier,
} from './medal.js';
import { Skills } from '../skills.js';
import { MEDAL_XP_BONUS } from '../upgrades.js';

export const MedalCategories = ['skill', 'dedication', 'mastery', 'ranked', 'secret'] as const;
export type MedalCategory = (typeof MedalCategories)[number];

const LOOKS: Record<MedalCategory, { shape: MedalShape, hue: number }> = {
	skill: {
		shape: 'hexagon', hue: 205,
	},
	dedication: {
		shape: 'circle', hue: 275,
	},
	mastery: {
		shape: 'octagon', hue: 10,
	},
	ranked: {
		shape: 'diamond', hue: 150,
	},
	secret: {
		shape: 'circle', hue: 320,
	},
};

export type MedalDef = {
	id: string,
	category: MedalCategory,
	tier: MedalTier,
	glyph: GlyphName,
};

export const medalLook = ({
	category, tier, glyph,
}: MedalDef): MedalLook => ({
	...LOOKS[category], tier, glyph,
});

const STAR_TIERS: MedalTier[] = ['bronze', 'bronze', 'silver', 'silver', 'gold', 'gold',
	'platinum', 'platinum', 'divine', 'divine'];

const SKILL_GLYPHS: Record<(typeof Skills)[number], GlyphName> = {
	accuracy: 'target',
	speed: 'lightning',
	stamina: 'heartbeat',
	jackspeed: 'keyboard',
	coordination: 'handFist',
	release: 'wind',
	reading: 'eye',
	consistency: 'mountains',
	concentration: 'brain',
	speedjam: 'waveform',
	memory: 'fingerprint',
};

const def = (id: string, category: MedalCategory, tier: MedalTier, glyph: GlyphName): MedalDef => ({
	id, category, tier, glyph,
});

/** Every medal, by category, easiest first. Display text: display/medals.ts. */
export const MEDALS: MedalDef[] = [
	...STAR_TIERS.map((tier, i) => def(`pass-${i + 1}`, 'skill', tier, 'star')),
	...STAR_TIERS.map((tier, i) => def(`fc-${i + 1}`, 'skill', tier, 'shootingStar')),
	def('grade-ss', 'skill', 'silver', 'sparkle'),
	def('grade-x', 'skill', 'gold', 'diamond'),
	def('grade-xx', 'skill', 'divine', 'sealCheck'),
	def('rice', 'skill', 'gold', 'pianoKeys'),
	def('ln', 'skill', 'gold', 'waveform'),

	def('plays-100', 'dedication', 'bronze', 'musicNotes'),
	def('plays-1k', 'dedication', 'silver', 'headphones'),
	def('plays-5k', 'dedication', 'gold', 'repeat'),
	def('plays-25k', 'dedication', 'platinum', 'infinity'),
	def('plays-100k', 'dedication', 'divine', 'fire'),
	def('hits-100k', 'dedication', 'bronze', 'keyboard'),
	def('hits-1m', 'dedication', 'silver', 'keyboard'),
	def('hits-10m', 'dedication', 'gold', 'keyboard'),
	def('hits-50m', 'dedication', 'platinum', 'keyboard'),
	def('hits-1b', 'dedication', 'divine', 'keyboard'),
	def('time-10h', 'dedication', 'bronze', 'clock'),
	def('time-100h', 'dedication', 'silver', 'hourglass'),
	def('time-1000h', 'dedication', 'gold', 'timer'),
	def('time-10000h', 'dedication', 'platinum', 'mountains'),

	...Skills.flatMap(skill => [
		def(`${skill}-50`, 'mastery', 'silver', SKILL_GLYPHS[skill]),
		def(`${skill}-100`, 'mastery', 'gold', SKILL_GLYPHS[skill]),
		def(`${skill}-105`, 'mastery', 'platinum', SKILL_GLYPHS[skill]),
		def(`${skill}-110`, 'mastery', 'divine', SKILL_GLYPHS[skill]),
	]),
	def('overall-25', 'mastery', 'bronze', 'medal'),
	def('overall-50', 'mastery', 'silver', 'medal'),
	def('overall-75', 'mastery', 'gold', 'medal'),
	def('overall-100', 'mastery', 'gold', 'medal'),
	def('overall-105', 'mastery', 'platinum', 'medal'),
	def('overall-110', 'mastery', 'divine', 'medal'),
	def('upgrades-1', 'mastery', 'bronze', 'arrowFatLinesUp'),
	def('upgrades-10', 'mastery', 'silver', 'arrowFatLinesUp'),
	def('upgrades-50', 'mastery', 'gold', 'arrowFatLinesUp'),
	def('upgrades-100', 'mastery', 'platinum', 'arrowFatLinesUp'),
	def('ladders-1', 'mastery', 'silver', 'gear'),
	def('ladders-5', 'mastery', 'gold', 'gear'),
	def('ladders-10', 'mastery', 'platinum', 'gear'),
	def('ladders-15', 'mastery', 'divine', 'gear'),
	def('overdrive-2', 'mastery', 'silver', 'gauge'),
	def('overdrive-10', 'mastery', 'gold', 'gauge'),
	def('overdrive-100', 'mastery', 'platinum', 'gauge'),
	def('overdrive-1000', 'mastery', 'divine', 'gauge'),
	def('prestige-1', 'mastery', 'silver', 'crown'),
	def('prestige-5', 'mastery', 'gold', 'crown'),
	def('prestige-25', 'mastery', 'platinum', 'crown'),
	def('prestige-100', 'mastery', 'divine', 'crown'),
	def('rebirth', 'mastery', 'divine', 'butterfly'),

	def('first-1', 'ranked', 'silver', 'flag'),
	def('first-10', 'ranked', 'gold', 'trophy'),
	def('first-100', 'ranked', 'platinum', 'crown'),
	def('first-1000', 'ranked', 'divine', 'diamond'),
	def('pp-1k', 'ranked', 'silver', 'rocketLaunch'),
	def('pp-5k', 'ranked', 'gold', 'rocketLaunch'),
	def('pp-10k', 'ranked', 'platinum', 'rocketLaunch'),
	def('pp-20k', 'ranked', 'divine', 'rocketLaunch'),
	def('curator-1', 'ranked', 'bronze', 'plant'),
	def('curator-5', 'ranked', 'silver', 'plant'),
	def('curator-25', 'ranked', 'gold', 'plant'),
	def('curator-100', 'ranked', 'platinum', 'plant'),

	def('combo-727', 'secret', 'silver', 'sparkle'),
	def('same-map-100', 'secret', 'silver', 'repeat'),
	def('fail-99', 'secret', 'silver', 'skull'),
	def('night-owl', 'secret', 'silver', 'moonStars'),
	def('first-chat', 'secret', 'silver', 'chatCircleDots'),
	def('possessed', 'secret', 'silver', 'ghost'),
];

const STEPS = Array.from({ length: 10 }, (_, i) => i + 1);

/** How each category reads as rows: one series per line (1★ to 10★, play
 *  counts...), so a step lines up with the same step on the next line. */
export const MEDAL_LINES: Record<MedalCategory, string[][]> = {
	skill: [
		STEPS.map(n => `pass-${n}`),
		STEPS.map(n => `fc-${n}`),
		['grade-ss', 'grade-x', 'grade-xx'],
		['rice', 'ln'],
	],
	dedication: [
		['plays-100', 'plays-1k', 'plays-5k', 'plays-25k', 'plays-100k'],
		['hits-100k', 'hits-1m', 'hits-10m', 'hits-50m', 'hits-1b'],
		['time-10h', 'time-100h', 'time-1000h', 'time-10000h'],
	],
	mastery: [
		Skills.map(skill => `${skill}-50`),
		Skills.map(skill => `${skill}-100`),
		Skills.map(skill => `${skill}-105`),
		Skills.map(skill => `${skill}-110`),
		['overall-25', 'overall-50', 'overall-75', 'overall-100', 'overall-105', 'overall-110'],
		['upgrades-1', 'upgrades-10', 'upgrades-50', 'upgrades-100'],
		['ladders-1', 'ladders-5', 'ladders-10', 'ladders-15'],
		['overdrive-2', 'overdrive-10', 'overdrive-100', 'overdrive-1000'],
		['prestige-1', 'prestige-5', 'prestige-25', 'prestige-100'],
		['rebirth'],
	],
	ranked: [
		['first-1', 'first-10', 'first-100', 'first-1000'],
		['pp-1k', 'pp-5k', 'pp-10k', 'pp-20k'],
		['curator-1', 'curator-5', 'curator-25', 'curator-100'],
	],
	secret: [
		['combo-727', 'same-map-100', 'fail-99', 'night-owl', 'first-chat', 'possessed'],
	],
};

const BY_ID = new Map(MEDALS.map(m => [m.id, m]));

export const medalById = (id: string): MedalDef | undefined => BY_ID.get(id);

/** XP-gain multiplier from the medals held: each one compounds its tier bonus. */
export const medalXPMultiplier = (ids: readonly string[]): number => ids.reduce((product, id) => {
	const medal = BY_ID.get(id);
	return medal ? product * (1 + MEDAL_XP_BONUS[medal.tier]) : product;
}, 1);
