import '../components/direct/direct.css';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import { openPage } from '../globals';
import Page from '../components/page/Page';
import DirectView from '../components/direct/DirectView';
import { directDisplay } from '../components/direct/directState';

/** oss!direct: every ranked or player's map, downloadable from inside the game. */
export default function Direct() {
	const { t } = useLingui();
	const [display] = useSynced(directDisplay);
	const subtitles = {
		ranked: [t`The latest ranked beatmaps`, t`The most played ranked beatmaps`],
		unranked: [t`The latest unranked beatmaps`, t`The most played unranked beatmaps`],
		all: [t`The latest beatmaps`, t`The most played beatmaps`],
	}[display];

	return (
		<Page
			title={<Trans>oss!direct</Trans>}
			onBack={() => openPage.set(undefined)}
			tabs={[
				{
					id: 'new',
					label: <Trans>New Releases</Trans>,
					subtitle: subtitles[0],
					render: () => <DirectView sort='new' />,
				},
				{
					id: 'played',
					label: <Trans>Most Played</Trans>,
					subtitle: subtitles[1],
					render: () => <DirectView sort='played' />,
				},
			]}
		/>
	);
}
