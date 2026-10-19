import { ph } from '@lingui/core/macro';
import { useState } from 'react';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import type Skill from '@oss-idle/shared/sim/skills/skill';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import { skillName } from '@oss-idle/shared/display/skills';
import {
	canPrestige,
	maxUpgrades,
	prestigeMinLevel,
	prestigeXPMultiplier,
	UPGRADES_PER_PRESTIGE,
} from '@oss-idle/shared/upgrades';
import { levelProgress } from '@oss-idle/shared/display/levelDisplay';
import { xpToLevel } from '@oss-idle/shared/sim/skills/xp';
import SkillLevel from '@oss-idle/shared/display/SkillLevel';
import HoverCard from '@oss-idle/shared/display/HoverCard';
import HoverCardRow from '@oss-idle/shared/display/HoverCardRow';
import num from '@oss-idle/shared/display/num';
import ConfirmMenu, { type Confirm } from '../ConfirmMenu';
import { prestigeSkill } from '../../online/services/prestige';
import PrestigeDiamonds from './PrestigeDiamonds';

export default function PrestigeRow({
	skill,
	locked,
	lifetimeXp,
}: {
	skill: Skill,
	locked: boolean,
	/** xp ever earned on the skill, shown as a level behind it on hover */
	lifetimeXp?: number,
}) {
	const { t } = useLingui();
	const [level] = useSynced(skill.level);
	const [xp] = useSynced(skill.xp);
	const [prestige] = useSynced(skill.prestige);
	const [busy, setBusy] = useState(false);
	const [confirming, setConfirming] = useState<Confirm | undefined>(undefined);

	const required = prestigeMinLevel(prestige);
	const ready = !locked && canPrestige({
		level, prestige,
	});
	const multiplier = prestigeXPMultiplier(prestige);
	const factor = multiplier.toFixed(2);
	const next = prestigeXPMultiplier(prestige + 1);
	const at = level + levelProgress(level, xp);
	const earned = xpToLevel(level) + xp;
	const needed = xpToLevel(required);
	const progress = Math.min(1, earned / needed);

	const run = async () => {
		if (busy) return;
		setBusy(true);
		try {
			await prestigeSkill(skill.name);
		} finally {
			setBusy(false);
		}
	};

	const confirm = () => {
		if (!ready || busy) return;
		const name = skillName(skill.name);
		setConfirming({
			title: t`Prestige ${name}?`,
			sub: t`XP Lv${level} → XP Lv0 · Loses every upgrade and all Overdrive · Keeps +${ph({ bonus: prestige + 1 })} bonus levels, ${ph({ slots: maxUpgrades(prestige + 1) })} gear slots and x${ph({ multiplier: next.toFixed(2) })} XP`,
			confirmLabel: t`Prestige`,
			color: '#ff4089',
			onConfirm: () => void run(),
		});
	};

	const card = <>
		<HoverCardRow label={<Trans>XP</Trans>}>
			{num(Math.floor(earned))} / {num(needed)}
		</HoverCardRow>
		{!ready && <HoverCardRow label={<Trans>To go</Trans>}>
			{num(Math.ceil(needed - earned))}
		</HoverCardRow>}
	</>;

	return (
		<div className={`ladder-row ${ready ? 'is-ready' : ''}`}>
			<div className="ladder-row__skill">
				<span className="ladder-row__name">{skillName(skill.name)}</span>
				<span className="ladder-row__lv">
					<Trans>XP Lv<SkillLevel
						level={level} xp={xp} prestige={prestige} lifetimeXp={lifetimeXp} xpLevel
					/></Trans>
				</span>
				<span className={`ladder-row__mult ${prestige > 0 ? '' : 'is-base'}`}>
					<Trans>x{factor} XP</Trans>
				</span>
				{prestige > 0 && <span className="ladder-row__od"><Trans>+{prestige} Lv</Trans></span>}
			</div>
			<HoverCard className="ladder-row__ladder" card={card}>
				<div className="ladder-row__gear">
					<PrestigeDiamonds prestige={prestige} />
					<span className="ladder-row__next">
						<span className="ladder-row__arrow">›</span>
						<Trans>+{ph({ bonus: 1 })} Lv · +{ph({ slots: UPGRADES_PER_PRESTIGE })} gear slot · x{ph({ multiplier: next.toFixed(2) })} XP</Trans>
					</span>
					<span className="ladder-row__count">{at.toFixed(2)} / {required}</span>
				</div>
				<div className={`prestige-bar ${ready ? 'is-ready' : ''}`}>
					<span style={{ transform: `scaleX(${progress})` }} />
				</div>
			</HoverCard>
			<HoverCard className="ladder-act__main prestige-act" card={card}>
				{ready
					? <button className="ladder-act__buy" disabled={busy} onClick={confirm}>
						<span><Trans>Prestige</Trans></span>
					</button>
					: <span className="ladder-act__state"><span><Trans>Requires XP Lv{required}</Trans></span></span>}
			</HoverCard>
			{confirming && <ConfirmMenu
				{...confirming}
				onClose={() => setConfirming(undefined)}
			/>}
		</div>
	);
}
