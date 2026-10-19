import { Trans } from '@lingui/react/macro';
import {
	UPGRADE_LEVELS,
	UPGRADE_XP_BONUS,
} from '@oss-idle/shared/upgrades';
import type Character from '../../db/schema/character';
import UpgradesSummary from './UpgradesSummary';
import UpgradeRow from './UpgradeRow';
import './ladder.css';

export default function UpgradesView({ character }: { character: Character }) {
	const bonus = Math.round(UPGRADE_XP_BONUS * 100);
	const locked = character.id === 0;

	return (
		<div className="ladder">
			<UpgradesSummary skills={character.skills} locked={locked} />
			<div className="ladder__list">
				{character.skills.map(skill => (
					<UpgradeRow
						key={`${character.id}:${skill.name}`}
						skill={skill}
						locked={locked}
						lifetimeXp={character[`${skill.name}LifetimeXp`]}
					/>
				))}
			</div>
			<p className="ladder__hint">
				<Trans>
					An upgrade costs {UPGRADE_LEVELS} raw levels of the skill and
					boosts its XP gains by {bonus}%. Buying above the required level spends
					more XP and feeds Overdrive, which multiplies the gains further.
				</Trans>
			</p>
		</div>
	);
}
