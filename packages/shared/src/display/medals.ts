import {
	__,
	defineMessages,
} from '../i18n/translate.js';
import type { MedalTier } from '../achievements/medal.js';
import type { MedalCategory } from '../achievements/catalogue.js';
import {
	Skills,
	type SkillName,
} from '../skills.js';
import { skillName } from './skills.js';
import num from './num.js';

const TIER_NAMES = defineMessages({
	bronze: 'Bronze medal',
	silver: 'Silver medal',
	gold: 'Gold medal',
	platinum: 'Platinum medal',
	divine: 'Divine medal',
} satisfies Record<MedalTier, string>);

export const medalTierName = (tier: MedalTier): string => __(TIER_NAMES[tier]);

const CATEGORY_NAMES = defineMessages({
	skill: 'Skill',
	dedication: 'Dedication',
	mastery: 'Mastery',
	ranked: 'Ranked',
	secret: 'Hush-Hush',
} satisfies Record<MedalCategory, string>);

export const medalCategoryName = (category: MedalCategory): string =>
	__(CATEGORY_NAMES[category]);

const NAMES = defineMessages({
	'pass-1': 'First Steps',
	'pass-2': 'Finding the Beat',
	'pass-3': 'Keeping Up',
	'pass-4': 'Hands Awake',
	'pass-5': 'Into the Storm',
	'pass-6': 'Wall of Notes',
	'pass-7': 'Beyond Reason',
	'pass-8': 'Eight Stars Up',
	'pass-9': 'Nine Lives',
	'pass-10': 'Ten-Star Legend',
	'fc-1': 'Clean Start',
	'fc-2': 'Unbroken',
	'fc-3': 'Steady Hands',
	'fc-4': 'Flawless Flow',
	'fc-5': 'Iron Combo',
	'fc-6': 'Glass Cannon',
	'fc-7': 'Perfect Storm',
	'fc-8': 'Untouchable',
	'fc-9': 'Beyond Perfect',
	'fc-10': 'Absolute',
	'grade-ss': 'Spotless',
	'grade-x': 'Crystal Clear',
	'grade-xx': 'Divine Touch',
	rice: 'Rice Cooker',
	ln: 'Hold the Line',
	'plays-100': 'Warming Up',
	'plays-1k': 'Regular',
	'plays-5k': 'Devoted',
	'plays-25k': 'No Life',
	'plays-100k': 'Eternal',
	'hits-100k': 'Tapping Away',
	'hits-1m': 'Million Taps',
	'hits-10m': 'Worn Switches',
	'hits-50m': 'Keyboard Breaker',
	'hits-1b': 'Billion Club',
	'time-10h': 'Time Flies',
	'time-100h': 'Where Did The Day Go',
	'time-1000h': 'Lifer',
	'time-10000h': 'Ten Thousand Hours',
	'overall-25': 'Well Rounded',
	'overall-50': 'Halfway There',
	'overall-75': 'Seasoned',
	'overall-100': 'Centurion',
	'overall-105': 'Overachiever',
	'overall-110': 'Ascendant',
	'upgrades-1': 'Gearing Up',
	'upgrades-10': 'Shopping Spree',
	'upgrades-50': 'Big Spender',
	'upgrades-100': 'Fully Loaded',
	'ladders-1': 'Top of the Line',
	'ladders-5': 'Kitted Out',
	'ladders-10': 'Perfectionist',
	'ladders-15': 'Completionist',
	'overdrive-2': 'Redline',
	'overdrive-10': 'Overclocked',
	'overdrive-100': 'Meltdown',
	'overdrive-1000': 'Singularity',
	'prestige-1': 'Fresh Start',
	'prestige-5': 'Again and Again',
	'prestige-25': 'Prestigious',
	'prestige-100': 'Eternal Return',
	rebirth: 'Born Again',
	'first-1': 'Number One',
	'first-10': 'Collector',
	'first-100': 'Royalty',
	'first-1000': 'Undisputed',
	'pp-1k': 'Liftoff',
	'pp-5k': 'High Orbit',
	'pp-10k': 'Escape Velocity',
	'pp-20k': 'Beyond the Stars',
	'curator-1': 'Curator',
	'curator-5': 'Talent Scout',
	'curator-25': 'Tastemaker',
	'curator-100': 'Archivist',
	'combo-727': 'When You See It',
	'same-map-100': 'Broken Record',
	'fail-99': 'So Close',
	'night-owl': 'Night Owl',
	'first-chat': 'Hello World',
	possessed: 'Possessed',
});

const DESCRIPTIONS = defineMessages({
	'grade-ss': 'Get an SS on a ranked map',
	'grade-x': 'Get an X on a ranked map',
	'grade-xx': 'Get an XX on a ranked map',
	rice: 'Pass a 4★ or harder map made of over 90% single notes',
	ln: 'Pass a 4★ or harder map made of over 50% long notes',
	'upgrades-1': 'Buy your first upgrade',
	'ladders-1': 'Buy every upgrade of a skill',
	'prestige-1': 'Prestige a skill',
	rebirth: 'Rebirth your character',
	'first-1': 'Take #1 on a ranked map',
	'curator-1': 'Propose a map that gets ranked',
	'combo-727': 'Finish a play at exactly 727 combo',
	'same-map-100': 'Play the same map 100 times',
	'fail-99': 'Fail a map with 1% of it left',
	'night-owl': 'Play between 3 and 5 am',
	'first-chat': 'Say something in #osu!idle',
	possessed: 'Get a 1,000,000 score on TAG underground - POSSESSION',
});

/** The medals of a numbered series share one text: the number is the medal
 *  id's (`plays-1k`, `time-10h`). */
const SERIES_DESCRIPTIONS = defineMessages({
	pass: 'Pass a ranked map of {stars}★ or more',
	fc: 'Full combo a ranked map of {stars}★ or more',
	plays: 'Play {count} ranked maps',
	hits: 'Hit {count} notes',
	time: 'Play for {hours} hours',
	overall: 'Reach overall level {level}',
	upgrades: 'Buy {count} upgrades',
	ladders: 'Max out the upgrades of a skill {count} times',
	overdrive: 'Reach {omega}ω overdrive on a skill',
	prestige: 'Prestige {count} times in total',
	first: 'Hold #1 on {count} ranked maps',
	pp: 'Reach {pp} pp',
	curator: 'Have {count} of your proposed maps ranked',
});

/** A skill's mastery medals: the tier, with the skill as `medalSkill` gives it. */
const SKILL_TIERS = defineMessages({
	50: '{skill} Adept',
	100: '{skill} Master',
	105: '{skill} Grandmaster',
	110: '{skill} Legend',
});

/** The skill as it reads inside a medal name - its own string, so a language
 *  can give it the form the name needs (French: "Adepte de la précision", so
 *  the skill is "de la précision" and the tier "Adepte {skill}"). The context
 *  must be a literal in each call for extraction. */
const MEDAL_SKILL: Record<SkillName, () => string> = {
	accuracy: () => __('Accuracy', 'skill in a medal name'),
	speed: () => __('Speed', 'skill in a medal name'),
	stamina: () => __('Stamina', 'skill in a medal name'),
	jackspeed: () => __('Jack Speed', 'skill in a medal name'),
	coordination: () => __('Coordination', 'skill in a medal name'),
	release: () => __('Release', 'skill in a medal name'),
	reading: () => __('Reading', 'skill in a medal name'),
	consistency: () => __('Consistency', 'skill in a medal name'),
	concentration: () => __('Concentration', 'skill in a medal name'),
	speedjam: () => __('Speed Jam', 'skill in a medal name'),
	memory: () => __('Memory', 'skill in a medal name'),
};

const MULTIPLIERS: Record<string, number> = {
	'': 1, k: 1e3, m: 1e6, b: 1e9,
};

/** A numbered medal's series and number: `plays-1k` is plays, 1000. */
const series = (id: string): { name: string, n: number } | undefined => {
	const match = /^(.+)-(\d+)([kmb]?)h?$/.exec(id);
	return match ? {
		name: match[1], n: Number(match[2]) * MULTIPLIERS[match[3]],
	} : undefined;
};

const isSkill = (name: string): name is SkillName => (Skills as readonly string[]).includes(name);

export const medalName = (id: string): string => {
	const numbered = series(id);
	if (numbered && isSkill(numbered.name)) {
		const template = SKILL_TIERS[numbered.n as keyof typeof SKILL_TIERS];
		return __(template, undefined, { skill: MEDAL_SKILL[numbered.name]() });
	}
	return __(NAMES[id as keyof typeof NAMES]);
};

export const medalDescription = (id: string): string => {
	const unique = DESCRIPTIONS[id as keyof typeof DESCRIPTIONS];
	if (unique) return __(unique);
	const { name, n } = series(id)!;
	if (isSkill(name)) {
		return __('Reach level {level} in {skill}', undefined, {
			level: n, skill: skillName(name),
		});
	}
	return __(SERIES_DESCRIPTIONS[name as keyof typeof SERIES_DESCRIPTIONS], undefined, {
		stars: n, count: num(n), hours: num(n), level: n, omega: n, pp: num(n),
	});
};
