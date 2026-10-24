import { useState } from 'react';
import { Trans } from '@lingui/react/macro';
import {
	ADDON_BUILD_STATUS,
	repoCommitUrl,
} from '@oss-idle/shared/addon';
import type { OwnAddon } from '../../online/addons';

/** Where a repo add-on's builds stand: the last one, its log. */
export default function AddonRepoBuild({ addon }: { addon: OwnAddon }) {
	const [showLog, setShowLog] = useState(addon.buildStatus === ADDON_BUILD_STATUS.failed);

	const status = {
		[ADDON_BUILD_STATUS.idle]: <Trans>Up to date</Trans>,
		[ADDON_BUILD_STATUS.queued]: <Trans>Waiting for the builder…</Trans>,
		[ADDON_BUILD_STATUS.building]: <Trans>Building…</Trans>,
		[ADDON_BUILD_STATUS.failed]: <Trans>Build failed</Trans>,
	}[addon.buildStatus];

	return (
		<>
			<div className='listing-field'>
				<span><Trans>Build</Trans></span>
				<div className={`addon-repo__status addon-repo__status--${addon.buildStatus}`}>{status}</div>
				{addon.tag && addon.commit && addon.repoUrl && (
					<div className='listing__by'>
						<Trans>Last build:</Trans>{' '}
						<a href={repoCommitUrl(addon.repoUrl, addon.commit)} target='_blank' rel='noreferrer'>
							{addon.tag} ({addon.commit.slice(0, 7)})
						</a>
					</div>
				)}
			</div>

			{addon.buildLog && (
				<>
					<button className='listings__sort-btn' onClick={() => setShowLog(s => !s)}>
						{showLog ? <Trans>Hide build log</Trans> : <Trans>View build log</Trans>}
					</button>
					{showLog && <pre className='addon-repo__log'>{addon.buildLog}</pre>}
				</>
			)}
		</>
	);
}
