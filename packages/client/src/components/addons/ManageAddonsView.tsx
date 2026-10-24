import { ph } from '@lingui/core/macro';
import {
	useEffect,
	useState,
} from 'react';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import { useAction } from '@oss-idle/shared/hooks/useAction';
import {
	ADDON_KIND,
	parseAddonTypes,
} from '@oss-idle/shared/addon';
import Auth from '../../online/auth';
import {
	Addon as InstalledAddon,
	addonsVersion,
} from '../../db/schema/addon';
import {
	disableAddon,
	enableAddon,
	installAddon,
	remountAddon,
	uninstallAddon,
} from '../../addons/runtime';
import {
	deleteAddon,
	getAddon,
	myAddons,
	submitAddon,
	type Addon,
	type OwnAddon,
} from '../../online/addons';
import AddonView, {
	detailOfDTO,
	newAddonDetail,
	type AddonDetail,
} from './AddonView';
import MyAddonRow from './MyAddonRow';
import InstalledAddonRow from './InstalledAddonRow';
import ConfirmMenu, { type Confirm } from '../ConfirmMenu';
import PageBarActions from '../page/PageBarActions';
import { useHasUpdate } from '../listing/useHasUpdate';

/** What the editor is editing: a blank draft (`{}`) or an existing add-on. */
type Editing = { addon?: OwnAddon };

const detailOfInstalled = (a: InstalledAddon): AddonDetail => ({
	name: a.name,
	authorName: a.authorName,
	version: a.version,
	gameVersion: a.gameVersion,
	description: a.description,
	tags: a.tags ? a.tags.split(',') : [],
	types: parseAddonTypes(a.types ?? ''),
	icon: a.icon,
	source: a.source,
	kind: ADDON_KIND.inline,
});

export default function ManageAddonsView() {
	const { t } = useLingui();
	const [user] = useSynced(Auth.user);
	const [version] = useSynced(addonsVersion);
	const [editing, setEditing] = useState<Editing | undefined>();
	const [installed, setInstalled] = useState<InstalledAddon[]>([]);
	const [mine, setMine] = useState<OwnAddon[]>([]);
	const [details, setDetails] = useState<AddonDetail | undefined>();
	const [updating, setUpdating] = useState<{ 
		remote: Addon, 
		local: InstalledAddon 
	} | undefined>();
	const [confirming, setConfirming] = useState<Confirm | undefined>();
	const {
		busy, error, setError, run: act,
	} = useAction();

	useEffect(() => { 
		void InstalledAddon.getAll()
			.then(setInstalled); 
	}, [version]);

	const refreshMine = () => {
		if (!user) { setMine([]); return Promise.resolve(); }
		return myAddons().then(setMine).catch(e => setError(String(e.message ?? e)));
	};
	useEffect(() => { void refreshMine(); }, [user]);
	const hasUpdate = useHasUpdate(installed, getAddon);

	const run = (fn: () => Promise<unknown>) => act(fn, refreshMine);

	const openUpdate = (a: InstalledAddon) => run(async () => {
		setUpdating({
			remote: await getAddon(a.id), local: a, 
		});
	});

	const applyUpdate = () => updating && run(async () => {
		const { remote, local } = updating;
		await local.update({ 
			source: remote.source, 
			version: remote.version,
			gameVersion: remote.gameVersion,
			name: remote.name,
			description: remote.description,
			tags: remote.tags.join(','),
			types: remote.types.join(','),
			icon: remote.icon, 
			status: remote.status, 
		});
		await remountAddon(local);
		setUpdating(undefined);
	});

	if (editing) {
		return (
			<AddonView
				key={editing.addon?.id ?? 'new'}
				mode='edit'
				detail={editing.addon ? detailOfDTO(editing.addon) : newAddonDetail()}
				addon={editing.addon}
				onBack={() => setEditing(undefined)}
				onSaved={saved => {
					// a new repo add-on stays open on its webhook
					setEditing(!editing.addon && saved.kind === ADDON_KIND.repo ? { addon: saved } : undefined);
					void refreshMine();
				}}
			/>
		);
	}
	if (updating) {
		return (
			<AddonView
				mode='view'
				detail={detailOfDTO(updating.remote)}
				diffAgainst={updating.local.source}
				actions={[
					{
						id: 'update',
						label: <Trans>Update</Trans>,
						onClick: applyUpdate,
						disabled: busy,
						order: 20,
					},
				]}
				onBack={() => setUpdating(undefined)}
			/>
		);
	}
	if (details) {
		return <AddonView 
			mode='view' 
			detail={details}
			onBack={() => setDetails(undefined)} 
		/>;
	}

	return (
		<>
			<div className='page__section'><Trans>Your add-ons</Trans></div>

			{!user && <p className='page__muted'>
				<Trans>Sign in to create and publish add-ons.</Trans>
			</p>}
			{user && mine.length === 0 && <p className='page__muted'>
				<Trans>You haven't created any add-ons yet.</Trans>
			</p>}

			<div className='page__list'>
				{mine.map(a => (
					<MyAddonRow
						key={a.id}
						addon={a}
						busy={busy}
						onEdit={() => setEditing({ addon: a })}
						onSubmit={() => setConfirming({
							title: t`Publish add-on`,
							sub: t`Add-ons are not reviewed: you are responsible for what yours does on players' games. Your published code must be licensed under the AGPLv3 (or a compatible licence). This does not necessarily affect its source's license. Publish "${ph({ addon: a.name })}"?`,
							confirmLabel: t`Publish`,
							color: '#ff66ab',
							onConfirm: () => run(() => submitAddon(a.id)),
						})}
						onInstall={() => run(() => installAddon(a))}
						onDelete={() => setConfirming({
							title: t`Delete add-on`,
							sub: t`Permanently delete "${ph({ addon: a.name })}"? This cannot be undone.`,
							confirmLabel: t`Delete`,
							onConfirm: () => run(() => deleteAddon(a.id)),
						})}
					/>
				))}
			</div>

			<div className='page__section'><Trans>Installed</Trans></div>
			{installed.length === 0 && <p className='page__muted'>
				<Trans>No add-ons installed. Browse the catalog to find some.</Trans>
			</p>}

			<div className='page__list'>
				{installed.map(a => (
					<InstalledAddonRow
						key={a.id}
						addon={a}
						busy={busy}
						hasUpdate={hasUpdate(a)}
						onToggle={enabled => run(() => enabled ? enableAddon(a) : disableAddon(a))}
						onDetails={() => setDetails(detailOfInstalled(a))}
						onUpdate={() => openUpdate(a)}
						onUninstall={() => setConfirming({
							title: t`Uninstall add-on`,
							sub: t`Remove "${ph({ addon: a.name })}" ?`,
							confirmLabel: t`Uninstall`,
							onConfirm: () => run(() => uninstallAddon(a)),
						})}
					/>
				))}
			</div>

			{error && <div className='page__error'>{error}</div>}
			{confirming && <ConfirmMenu 
				{...confirming} 
				onClose={() => setConfirming(undefined)} 
			/>}

			{user && (
				<PageBarActions actions={[
					{
						id: 'create',
						label: <Trans>Create new add-on</Trans>,
						onClick: () => setEditing({}),
						order: 10,
					},
				]} />
			)}
		</>
	);
}
