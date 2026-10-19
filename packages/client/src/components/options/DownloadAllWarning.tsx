import './DownloadAllWarning.css';
import { createPortal } from 'react-dom';
import { useLingui } from '@lingui/react/macro';
import Log from '@oss-idle/shared/helpers/log';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import { desktop } from '@oss-idle/shared/desktop';
import ConfirmMenu from '../ConfirmMenu';
import ContextMenu from '../ContextMenu';
import Auth from '../../online/auth';
import type { Metadata } from '../../osu/beatmap/beatmap_api';
import { downloadAll } from '../../osu/beatmap/downloadAll';

/** The size warning before downloading every ranked beatmap. Shown to everyone,
 *  since the size is why it's a supporter perk; only supporters can go on. */
export default function DownloadAllWarning({ sets, onClose }: {
	sets: Metadata[];
	onClose: () => void;
}) {
	const { t, i18n } = useLingui();
	const [user] = useSynced(Auth.user);

	const bytes = sets.reduce((sum, s) => sum + s.size, 0);
	const gb = bytes >= 1e9;
	const size = new Intl.NumberFormat(i18n.locale, {
		style: 'unit', unit: gb ? 'gigabyte' : 'megabyte', maximumFractionDigits: 1,
	}).format(bytes / (gb ? 1e9 : 1e6));
	const count = sets.length;

	const title = t`Download every ranked beatmap?`;
	const sub = [
		t`This is a very big download: ${count} beatmap sets, taking about ${size} of disk space.`,
		...user?.supporter ? [] : [t`That's why downloading them all at once is an osu!supporter perk.`],
		...desktop() ? [] : [
			t`Here they are stored by your browser: the desktop app is better suited to keeping this many.`,
		],
	].join(' ');

	const start = () => downloadAll(sets)
		.then(finished => Log.popup(finished ? t`All ranked beatmaps downloaded.` : t`Download stopped.`))
		.catch(e => Log.errorPopup(String(e)));

	// out of the options panel, which would clip it, and above it
	return createPortal(<div className="download-all-warning">
		{user?.supporter
			? <ConfirmMenu
				title={title}
				sub={sub}
				confirmLabel={t`Download all`}
				color="#2f5f9a"
				onConfirm={() => void start()}
				onClose={onClose}
			/>
			: <ContextMenu
				title={title}
				sub={sub}
				onClose={onClose}
				options={[{
					label: t`Close`, color: '#6b6b6b', onClick: onClose,
				}]}
			/>}
	</div>, document.body);
}
