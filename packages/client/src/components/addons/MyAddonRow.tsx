import { Trans } from '@lingui/react/macro';
import {
	ADDON_BUILD_STATUS,
	ADDON_STATUS,
} from '@oss-idle/shared/addon';
import { addonStatusLabel } from '@oss-idle/shared/display/addon';
import {
	addonIconUrl,
	type Addon,
} from '../../online/addons';
import ListingIcon from '../listing/ListingIcon';

type Props = {
	addon: Addon,
	busy: boolean,
	onEdit: () => void,
	onSubmit: () => void,
	onInstall: () => void,
	onDelete: () => void,
};

/** A row in the author's "Your add-ons" list. */
export default function MyAddonRow({ 
	addon, 
	busy, 
	onEdit, 
	onSubmit, 
	onInstall, 
	onDelete, 
}: Props) {
	const canSubmit = addon.status === ADDON_STATUS.unpublished;
	const building = addon.buildStatus === ADDON_BUILD_STATUS.queued
		|| addon.buildStatus === ADDON_BUILD_STATUS.building;

	return (
		<div className='listing'>
			<ListingIcon url={addonIconUrl(addon.icon)} name={addon.name} />
			<div className='listing__main'>
				<div className='listing__name'>
					{addon.name}<span className='listing__ver'>v{addon.version}</span>
				</div>
				<div className='listing__row'>
					<span className={`listing__badge listing__badge--${addon.status}`}>
						{addonStatusLabel(addon.status)}
					</span>
					{addon.buildStatus === ADDON_BUILD_STATUS.failed && (
						<span className='listing__badge listing__badge--denied'><Trans>Build failed</Trans></span>
					)}
					{building && (
						<span className='listing__badge listing__badge--unpublished'><Trans>Building</Trans></span>
					)}
				</div>
			</div>
			<div className='listing__actions'>
				<button 
					className='listing-btn'
					disabled={busy} 
					onClick={onEdit}
				>
					<Trans>Edit</Trans>
				</button>
				{canSubmit && <button
					className='listing-btn listing-btn--primary' 
					disabled={busy} 
					onClick={onSubmit}
				>
					<Trans>Publish</Trans>
				</button>}
				<button 
					className='listing-btn' 
					disabled={busy} 
					onClick={onInstall}
				>
					<Trans>Install</Trans>
				</button>
				<button 
					className='listing-btn listing-btn--danger'
					disabled={busy} 
					onClick={onDelete}
				>
					<Trans>Delete</Trans>
				</button>
			</div>
		</div>
	);
}
