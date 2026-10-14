import type { ReactNode } from 'react';
import { Trans } from '@lingui/react/macro';
import Page from '../components/page/Page';

/** The character page around an upgrades layout, at a fixed desktop size. */
export default function UpgradesPreview({ children }: { children: ReactNode }) {
	return (
		<div style={{
			position: 'relative', width: 1280, height: 800, 
		}}>
			<Page
				title={<Trans>Character</Trans>}
				onBack={() => undefined}
				tabs={[
					{
						id: 'upgrades',
						label: <Trans>Upgrades</Trans>,
						subtitle: <Trans>Trade skill levels for permanent XP boosts</Trans>,
						render: () => children,
					},
					{
						id: 'prestige', label: <Trans>Prestige</Trans>, render: () => undefined, 
					},
					{
						id: 'rebirth', label: <Trans>Rebirth</Trans>, render: () => undefined, 
					},
				]}
			/>
		</div>
	);
}
