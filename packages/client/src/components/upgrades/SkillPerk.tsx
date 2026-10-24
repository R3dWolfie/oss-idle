import { useLingui } from '@lingui/react/macro';
import HoverCardRow from '@oss-idle/shared/display/HoverCardRow';
import { warmupCurve } from '@oss-idle/shared/fatigue';
import {
	fastestRate,
	rateLabel,
	slowestRate,
} from '@oss-idle/shared/rate';
import {
	SKILL,
	type SkillName,
} from '@oss-idle/shared/skills';

const Arrow = () => <span className="ladder-tip__arrow"> → </span>;

const hours = (minutes: number) => {
	const m = Math.round(minutes);
	return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
};

type Perk = [label: string, value: (upgrades: number) => string];

/** The upgrade tooltip's lines for a skill's own perks: what they give now, and after
 *  the next upgrade. Nothing for a skill without one. */
export default function SkillPerk({ skill, upgrades, next }: {
	skill: SkillName,
	upgrades: number,
	next: number,
}) {
	const { t } = useLingui();
	const perks: Partial<Record<SkillName, Perk[]>> = {
		[SKILL.speed]: [[t`Rates`, u => u > 0
			? `${rateLabel(slowestRate(u))}–${rateLabel(fastestRate(u))}`
			: rateLabel(1)]],
		[SKILL.stamina]: [
			[t`Warm-up`, u => hours(warmupCurve(u).warm)],
			[t`Peak until`, u => hours(warmupCurve(u).peakEnd)],
		],
	};
	return perks[skill]?.map(([label, perk]) => {
		const now = perk(upgrades);
		const after = perk(next);
		return <HoverCardRow key={label} label={label}>
			{now}{after !== now && <><Arrow /><span className="ladder-tip__boost">{after}</span></>}
		</HoverCardRow>;
	});
}
