import {
	useEffect,
	useReducer,
} from 'react';
import { Trans } from '@lingui/react/macro';
import type Skill from '@osu-idle/shared/sim/skills/skill';
import { skillName } from '@osu-idle/shared/display/skills';
import {
	canPrestige,
	prestigeXPMultiplier,
} from '@osu-idle/shared/upgrades';

const tally = (skills: Skill[], locked: boolean) => {
	const rows = skills.map(skill => {
		const state = {
			level: skill.level.get(),
			prestige: skill.prestige.get(),
		};
		return {
			skill,
			prestige: state.prestige,
			ready: !locked && canPrestige(state),
			boost: prestigeXPMultiplier(state.prestige),
		};
	});
	const sum = (pick: (r: typeof rows[number]) => number) =>
		rows.reduce((total, r) => total + pick(r), 0);
	return {
		taken: sum(r => r.prestige),
		ready: sum(r => Number(r.ready)),
		best: rows.reduce((a, b) => (b.boost > a.boost ? b : a)),
		average: sum(r => r.boost) / rows.length,
	};
};

export default function PrestigeSummary({ skills, locked }: { skills: Skill[], locked: boolean }) {
	const [, refresh] = useReducer((n: number) => n + 1, 0);

	useEffect(() => {
		const synceds = skills.flatMap(s => [s.level, s.prestige]);
		synceds.forEach(s => s.sync(refresh));
		return () => synceds.forEach(s => s.desync(refresh));
	}, [skills]);

	const s = tally(skills, locked);
	const best = skillName(s.best.skill.name);

	return (
		<div className="ladder-sum">
			<div className="ladder-sum__stat">
				<span className="ladder-sum__label"><Trans>Prestiges taken</Trans></span>
				<span className="ladder-sum__value">{s.taken}</span>
			</div>
			<div className={`ladder-sum__stat ${s.ready > 0 ? 'is-ready' : ''}`}>
				<span className="ladder-sum__label"><Trans>Ready to prestige</Trans></span>
				<span className="ladder-sum__value">{s.ready}</span>
			</div>
			<div className="ladder-sum__stat">
				<span className="ladder-sum__label"><Trans>Best XP boost</Trans></span>
				<span className="ladder-sum__value">
					x{s.best.boost.toFixed(2)}
					{s.best.prestige > 0 && <span className="ladder-sum__of">{best}</span>}
				</span>
			</div>
			<div className="ladder-sum__stat">
				<span className="ladder-sum__label"><Trans>Average XP boost</Trans></span>
				<span className="ladder-sum__value">x{s.average.toFixed(2)}</span>
			</div>
		</div>
	);
}
