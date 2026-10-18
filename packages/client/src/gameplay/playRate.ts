import Synced from '@osu-idle/shared/helpers/synced';
import {
	allowedRate,
	RATE_STEP,
} from '@osu-idle/shared/rate';
import { SKILL } from '@osu-idle/shared/skills';
import type Skill from '@osu-idle/shared/sim/skills/skill';
import { SETTINGS } from '../db/settings';
import Entities from '../entity/entities';
import type Character from '../db/schema/character';
import type { PlayContext } from '../online/play';

const speedOf = (character: Character): Skill | undefined =>
	character.skills.find(s => s.name === SKILL.speed);

export const speedUpgrades = (character: Character): number =>
	speedOf(character)?.upgrades.get() ?? 0;

/** The rate a play of this character starts at: the one picked, held to what its
 *  Speed upgrades unlock. */
export const rateFor = (character: Character): number =>
	allowedRate(SETTINGS.rate.get(), speedUpgrades(character));

/** The live character's rate: song select's music and the next play follow it. */
export const selectedRate = new Synced(1);

const update = () => void selectedRate.set(rateFor(Entities.character.get()));
let watched: Skill | undefined;
void Entities.character.sync(character => {
	watched?.upgrades.desync(update);
	watched = speedOf(character);
	void watched?.upgrades.sync(update);
	update();
});
void SETTINGS.rate.sync(update);

/** The rate a play runs at. A debug play has no session: it takes the one picked. */
export const rateOfPlay = (play: PlayContext): number =>
	play.mode === 'debug' ? selectedRate.get() : play.rate;

/** Pick a rate, held to what the live character has unlocked, and remember it as its
 *  side's last one. */
export const pickRate = (rate: number): void => {
	const next = allowedRate(rate, speedUpgrades(Entities.character.get()));
	void SETTINGS.rate.set(next);
	if (next > 1) void SETTINGS.fasterRate.set(next);
	if (next < 1) void SETTINGS.slowerRate.set(next);
};

/** One step faster (1) or slower (-1), across x1 too: the Ctrl shortcuts. */
export const stepRate = (direction: 1 | -1): void =>
	pickRate(selectedRate.get() + direction * RATE_STEP);
