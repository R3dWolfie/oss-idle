import '../components/upgrades/upgrades.css';
import '../components/character/character.css';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import useSynced from '@osu-idle/shared/hooks/useSynced';
import { openPage } from '../globals';
import Entities from '../entity/entities';
import Page from '../components/page/Page';
import UpgradesView from '../components/upgrades/UpgradesView';
import PrestigeView from '../components/character/PrestigeView';
import RebirthView from '../components/character/RebirthView';

/** The character page: the three progression loops, one per tab. */
export default function Character() {
	const { t } = useLingui();
	const [character] = useSynced(Entities.character);

	return (
		<Page
			title={<Trans>Character</Trans>}
			onBack={() => openPage.set(undefined)}
			tabs={[
				{
					id: 'upgrades',
					label: <Trans>Upgrades</Trans>,
					subtitle: t`Trade skill levels for XP boosts`,
					render: () => <UpgradesView character={character} />,
				},
				{
					id: 'prestige',
					label: <Trans>Prestige</Trans>,
					subtitle: t`Reset a skill for a permanent level bonus`,
					render: () => <PrestigeView character={character} />,
				},
				{
					id: 'rebirth',
					label: <Trans>Rebirth</Trans>,
					subtitle: t`Start over with a new character that unlocks new features`,
					render: () => <RebirthView />,
				},
			]}
		/>
	);
}
