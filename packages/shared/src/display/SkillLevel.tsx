import { effectiveLevelOf } from '../sim/skills/levelCurve.js';
import {
	levelFromTotalXp,
	levelFromXp,
	levelNode,
} from './levelDisplay.js';
import HoverCard from './HoverCard.js';
import HoverCardRow from './HoverCardRow.js';

/**
 * The level a character is shown at: their xp level plus prestige bonus levels.
 * Hovering breaks it back into the parts it was built from.
 *
 * The level -> skill mapping is deliberately absent: it belongs to the strain
 * curves, and the player is shown real levels.
 */
export default function SkillLevel({
	level,
	xp,
	prestige = 0,
	lifetimeXp,
}: {
	level: number,
	xp: number,
	prestige?: number,
	/** xp ever earned on the skill, shown as the level it would be worth */
	lifetimeXp?: number,
}) {
	const shown = effectiveLevelOf(level, xp, prestige);

	return <HoverCard card={<>
		<HoverCardRow label="XP level">{levelFromXp(level, xp)}</HoverCardRow>
		{prestige > 0 && <HoverCardRow label="Prestige">+{prestige}</HoverCardRow>}
		{!!lifetimeXp && <HoverCardRow label="Lifetime">{levelFromTotalXp(lifetimeXp)}</HoverCardRow>}
	</>}>
		{levelNode(shown, shown - Math.floor(shown))}
	</HoverCard>;
}
