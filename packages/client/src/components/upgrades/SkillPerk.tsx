import { useLingui } from '@lingui/react/macro';
import HoverCardRow from '@osu-idle/shared/display/HoverCardRow';
import {
	fastestRate,
	rateLabel,
	slowestRate,
} from '@osu-idle/shared/rate';
import {
	SKILL,
	type SkillName,
} from '@osu-idle/shared/skills';

const Arrow = () => <span className="ladder-tip__arrow"> → </span>;

/** What a skill's upgrade count gives besides its XP boost, written for display. */
const PERKS: Partial<Record<SkillName, (upgrades: number) => string>> = {
	[SKILL.speed]: upgrades => upgrades > 0
		? `${rateLabel(slowestRate(upgrades))}–${rateLabel(fastestRate(upgrades))}`
		: rateLabel(1),
};

/** The upgrade tooltip's line for a skill's own perk: what it gives now, and after
 *  the next upgrade. Nothing for a skill without one. */
export default function SkillPerk({ skill, upgrades, next }: {
	skill: SkillName,
	upgrades: number,
	next: number,
}) {
	const { t } = useLingui();
	const perk = PERKS[skill];
	if (!perk) return null;
	const labels: Partial<Record<SkillName, string>> = { [SKILL.speed]: t`Rates` };
	const now = perk(upgrades);
	const after = perk(next);
	return <HoverCardRow label={labels[skill]}>
		{now}{after !== now && <><Arrow /><span className="ladder-tip__boost">{after}</span></>}
	</HoverCardRow>;
}
