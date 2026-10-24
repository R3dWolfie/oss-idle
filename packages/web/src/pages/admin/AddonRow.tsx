import {
	ADDON_KIND,
	ADDON_STATUS,
	type AddonStatus,
} from '@oss-idle/shared/addon';
import {
	addonIconUrl,
	type AdminAddon,
} from '../../api/addons';
import AddonRepoLine from './AddonRepoLine';
import AddonRowCode from './AddonRowCode';
import { formatDate } from './formatDate';

export default function AddonRow({
	row, busy, onModerate,
}: {
	row: AdminAddon;
	busy: boolean;
	onModerate: (id: number, body: { status: AddonStatus }) => void;
}) {
	const icon = addonIconUrl(row.icon);

	return (
		<div className='admin-list__entry'>
			<div className='admin-list__info'>
				{icon
					? <img className='admin-list__cover' src={icon} alt='' />
					: <div className='admin-list__cover admin-list__cover--empty' />}
				<div className='admin-list__meta'>
					<span className='admin-list__title'>
						{row.name} <span className='admin-list__ver'>v{row.version}</span>
					</span>
					<span className='admin-list__creator'>by {row.authorName} · game v{row.gameVersion}</span>
					{row.tags.length > 0 && <span className='admin-list__tags'>{row.tags.join(', ')}</span>}
				</div>

				<span className={`admin-list__badge admin-list__badge--${row.status}`}>{row.status}</span>

				<div className='admin-list__stat'>
					<span className='admin-list__label'>Updated</span><span>{formatDate(row.updatedAt)}</span>
				</div>
				<div className='admin-list__stat'>
					<span className='admin-list__label'>Published</span><span>{formatDate(row.publishedAt)}</span>
				</div>
			</div>

			{row.description && <p className='admin-list__desc'>{row.description}</p>}
			{row.kind === ADDON_KIND.repo && <AddonRepoLine row={row} />}
			<AddonRowCode source={row.source} />

			<div className='admin-list__actions'>
				{row.status === ADDON_STATUS.published && (
					<button
						className='admin-list__btn admin-list__btn--warn'
						disabled={busy}
						onClick={() => onModerate(row.id, { status: ADDON_STATUS.unpublished })}
					>
						Unpublish
					</button>
				)}
			</div>
		</div>
	);
}
