import {
	Plural,
	Trans,
} from '@lingui/react/macro';
import HoverCardRow from '@osu-idle/shared/display/HoverCardRow';
import { levelFromXp } from '@osu-idle/shared/display/levelDisplay';
import num from '@osu-idle/shared/display/num';
import { overdriveText } from '@osu-idle/shared/display/overdrive';
import {
	upgradeXPMultiplier,
	type UpgradePurchase,
} from '@osu-idle/shared/upgrades';

const Arrow = () => <span className="ladder-tip__arrow"> → </span>;

/** What the buy button would do, before it is clicked; how far off it is when
 *  it cannot be bought yet. Levels here are XP levels, the ones upgrades spend. */
export default function UpgradeTooltip({
	level,
	xp,
	upgrades,
	overdrive,
	minLevel,
	preview,
}: {
	level: number,
	xp: number,
	upgrades: number,
	overdrive: number,
	minLevel: number,
	preview: UpgradePurchase | undefined,
}) {
	const boost = upgradeXPMultiplier(upgrades, overdrive).toFixed(2);

	if (!preview) {
		const toGo = minLevel - level;
		const nextBoost = upgradeXPMultiplier(upgrades + 1, overdrive).toFixed(2);
		return <>
			<HoverCardRow label={<Trans>XP level</Trans>}>{levelFromXp(level, xp)} / {minLevel}</HoverCardRow>
			<HoverCardRow label={<Trans>To go</Trans>}>
				<Plural value={toGo} one="# level" other="# levels" />
			</HoverCardRow>
			<HoverCardRow label={<Trans>XP boost</Trans>}>
				x{boost}<Arrow /><span className="ladder-tip__boost">x{nextBoost}</span>
			</HoverCardRow>
		</>;
	}

	const nextBoost = upgradeXPMultiplier(preview.upgrades, preview.overdrive).toFixed(2);
	return <>
		<HoverCardRow label={<Trans>XP level</Trans>}>
			{levelFromXp(level, xp)}<Arrow />{levelFromXp(preview.level, preview.xp)}
		</HoverCardRow>
		<HoverCardRow label={<Trans>XP spent</Trans>}>{num(Math.round(preview.spent))}</HoverCardRow>
		<HoverCardRow label={<Trans>Overdrive</Trans>}>
			{overdriveText(overdrive)}<Arrow />{overdriveText(preview.overdrive)}
		</HoverCardRow>
		<HoverCardRow label={<Trans>XP boost</Trans>}>
			x{boost}<Arrow /><span className="ladder-tip__boost">x{nextBoost}</span>
		</HoverCardRow>
	</>;
}
