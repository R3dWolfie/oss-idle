import { useState } from 'react';
import { useLingui } from '@lingui/react/macro';
import Log from '@oss-idle/shared/helpers/log';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import Button from './controls/Button';
import DownloadAllWarning from './DownloadAllWarning';
import type { Metadata } from '../../osu/beatmap/beatmap_api';
import {
	bulkDownload,
	missingSets,
	stopDownloadAll,
} from '../../osu/beatmap/downloadAll';

/** oss!supporter: every bundled or every ranked beatmap in one go, after a warning
 *  on its size. */
export default function DownloadAllBeatmaps({ bundled }: { bundled: boolean }) {
	const { t } = useLingui();
	const [progress] = useSynced(bulkDownload);
	const [pending, setPending] = useState<Metadata[]>();

	const click = async () => {
		if (progress) return stopDownloadAll();
		const sets = await missingSets(bundled);
		if (!sets.length) {
			return Log.popup(bundled
				? t`Every bundled beatmap is already downloaded.`
				: t`Every ranked beatmap is already downloaded.`);
		}
		setPending(sets);
	};

	const done = progress?.done ?? 0;
	const total = progress?.total ?? 0;

	return <>
		<Button
			accent={bundled ? '#2f5f9a' : '#d64045'}
			onClick={() => void click()}
			label={progress
				? t`Downloading beatmaps: ${done}/${total} (click to stop)`
				: bundled ? t`Download all bundled beatmaps` : t`Download all ranked beatmaps`}
		/>
		{pending && <DownloadAllWarning
			bundled={bundled}
			sets={pending}
			onClose={() => setPending(undefined)}
		/>}
	</>;
}
