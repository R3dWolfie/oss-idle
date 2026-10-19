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

/** osu!supporter: every ranked beatmap in one go, after a warning on its size. */
export default function DownloadAllBeatmaps() {
	const { t } = useLingui();
	const [progress] = useSynced(bulkDownload);
	const [pending, setPending] = useState<Metadata[]>();

	const click = async () => {
		if (progress) return stopDownloadAll();
		const sets = await missingSets();
		if (!sets.length) return Log.popup(t`Every ranked beatmap is already downloaded.`);
		setPending(sets);
	};

	const done = progress?.done ?? 0;
	const total = progress?.total ?? 0;

	return <>
		<Button
			accent="#2f5f9a"
			onClick={() => void click()}
			label={progress
				? t`Downloading beatmaps: ${done}/${total} (click to stop)`
				: t`Download all ranked beatmaps`}
		/>
		{pending && <DownloadAllWarning sets={pending} onClose={() => setPending(undefined)} />}
	</>;
}
