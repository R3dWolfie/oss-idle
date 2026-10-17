import Skill from '@osu-idle/shared/sim/skills/skill';
import type { SkillName } from '@osu-idle/shared/skills';
import Character from '../db/schema/character';

type Seed = [level: number, upgrades: number, overdrive: number, prestige: number];

/** Every state a row can be in: ready, short of the level, maxed, past the
 *  base ladder on a prestige, overdriven, untouched. */
const SEEDS: Record<SkillName, Seed> = {
	accuracy: [101, 10, 4.2, 1],
	speed: [64, 5, 0, 7],
	stamina: [47, 4, 1.3, 0],
	jackspeed: [33, 3, 0, 0],
	coordination: [88, 2, 0, 0],
	release: [12, 0, 0, 0],
	reading: [100, 10, 2.6, 0],
	consistency: [25, 2, 0, 0],
	concentration: [8, 0, 0, 0],
	speedjam: [41, 3, 0, 0],
	memory: [101, 11, 3.1, 2],
};

export const sampleCharacter = () => {
	const character = new Character({
		id: -1, name: 'Adri', local: 1, 
	} as never);
	for (const skill of character.skills) {
		const [level, upgrades, overdrive, prestige] = SEEDS[skill.name];
		void skill.level.set(level);
		void skill.xp.set(Skill.xpForLevel(level) * 0.4);
		void skill.upgrades.set(upgrades);
		void skill.overdrive.set(overdrive);
		void skill.prestige.set(prestige);
	}
	return character;
};
