import { ph } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { Addon as InstalledAddon } from '../../db/schema/addon';
import { addonIconUrl } from '../../online/addons';
import ListingIcon from '../listing/ListingIcon';

type Props = {
	addon: InstalledAddon,
	busy: boolean,
	hasUpdate: boolean,
	onToggle: (enabled: boolean) => void,
	onDetails: () => void,
	onUpdate: () => void,
	onUninstall: () => void,
};

/** A row in the "Installed" list. */
export default function InstalledAddonRow({
	addon, 
	busy, 
	hasUpdate,
	onToggle, 
	onDetails, 
	onUpdate, 
	onUninstall, 
}: Props) {
	return (
		<div className={`listing ${addon.enabled ? 'is-on' : ''}`}>
			<ListingIcon url={addonIconUrl(addon.icon)} name={addon.name} />
			<div className='listing__main'>
				<div className='listing__name'>
					{addon.name}<span className='listing__ver'>v{addon.version}</span>
				</div>
				<div className='listing__by'><Trans>by {ph({ author: addon.authorName })}</Trans></div>
			</div>
			<div className='listing__actions'>
				<label className='listing-toggle'>
					<input 
						type='checkbox' 
						checked={addon.enabled} 
						disabled={busy} 
						onChange={e => onToggle(e.target.checked)} 
					/>
					<span>
						<Trans>Enabled</Trans>
					</span>
				</label>
				<button 
					className='listing-btn' 
					disabled={busy} 
					onClick={onDetails}>
					<Trans>Details</Trans>
				</button>
				{hasUpdate && <button 
					className='listing-btn listing-btn--primary'
					disabled={busy} 
					onClick={onUpdate}
				>
					<Trans>Update</Trans>
				</button>}
				<button 
					className='listing-btn listing-btn--danger' 
					disabled={busy} 
					onClick={onUninstall}
				>
					<Trans>Uninstall</Trans>
				</button>
			</div>
		</div>
	);
}
