import { useEffect } from 'react';
import { Trans } from '@lingui/react/macro';
import { ADDON_BUILD_STATUS } from '@oss-idle/shared/addon';
import { useAction } from '@oss-idle/shared/hooks/useAction';
import {
	checkAddonRepo,
	myAddons,
	renewAddonHook,
	type OwnAddon,
} from '../../online/addons';
import AddonRepoBuild from './AddonRepoBuild';

type Props = {
	addon?: OwnAddon,
	onChange: (addon: OwnAddon) => void,
};

const POLL_MS = 5000;

/** The right column of a repo add-on's editor: its webhook and its builds. */
export default function AddonRepoPane({
	addon, onChange,
}: Props) {
	const {
		busy, error, run: act,
	} = useAction();

	const building = addon?.buildStatus === ADDON_BUILD_STATUS.queued
		|| addon?.buildStatus === ADDON_BUILD_STATUS.building;

	useEffect(() => {
		if (!building || !addon) return;
		const timer = setInterval(() => {
			void myAddons()
				.then(list => list.find(a => a.id === addon.id))
				.then(a => a && onChange(a))
				.catch(() => undefined);
		}, POLL_MS);
		return () => clearInterval(timer);
	}, [building, addon?.id]);

	if (!addon) {
		return (
			<div className='addon-repo'>
				<p className='page__muted'>
					<Trans>Save the add-on to get its webhook address. oss!idle builds every new version tag of the repository itself.</Trans>
				</p>
			</div>
		);
	}

	const run = (fn: () => Promise<OwnAddon>) => act(async () => onChange(await fn()));

	return (
		<div className='addon-repo'>
			<label className='listing-field'>
				<span><Trans>Webhook</Trans></span>
				<input readOnly value={addon.hookUrl ?? ''} onFocus={e => e.target.select()} />
			</label>
			<p className='listing-view__notice'>
				<Trans>Add this address as a push webhook of your repository, on any git host. Each new version tag (v1.2.3) is built by oss!idle from the repository, with npm ci and npm run build; addon.config.json names the built file. Once the add-on is published, players get each new build.</Trans>
			</p>
			<div className='addon-repo__row'>
				<button className='listing-btn' disabled={busy} onClick={() => run(() => renewAddonHook(addon.id))}>
					<Trans>New webhook address</Trans>
				</button>
				<button
					className='listing-btn listing-btn--primary'
					disabled={busy || building}
					onClick={() => run(() => checkAddonRepo(addon.id))}
				>
					<Trans>Check now</Trans>
				</button>
			</div>
			<AddonRepoBuild addon={addon} />
			{error && <div className='page__error'>{error}</div>}
		</div>
	);
}
