import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import {
	ADDON_KIND,
	AddonTypes,
	type AddonKind,
	type AddonType,
} from '@oss-idle/shared/addon';
import { addonTypeLabel } from '@oss-idle/shared/display/addon';
import IconField from '../listing/IconField';
import {
	addonIconUrl,
	uploadAddonIcon,
} from '../../online/addons';

/** The editor's metadata, as typed. */
export type AddonForm = {
	name: string,
	description: string,
	tags: string,
	/** what it is for: one or both, gameplay by default */
	types: AddonType[],
	version: string,
	gameVersion: string,
	icon: string | null,
	kind: AddonKind,
	repoUrl: string,
};

type Props = {
	form: AddonForm,
	set: <K extends keyof AddonForm>(key: K, value: AddonForm[K]) => void,
};

/** Left column of the add-on editor: where the code comes from, the metadata. */
export default function AddonEditMeta({
	form, set,
}: Props) {
	const { t } = useLingui();
	const repo = form.kind === ADDON_KIND.repo;
	const kindButton = (kind: AddonKind, label: React.ReactNode) => (
		<button
			className={`listings__sort-btn ${form.kind === kind ? 'is-active' : ''}`}
			onClick={() => set('kind', kind)}
		>
			{label}
		</button>
	);

	return (
		<>
			<div className='listing-view__codehead'>
				{kindButton(ADDON_KIND.inline, <Trans>Code written here</Trans>)}
				{kindButton(ADDON_KIND.repo, <Trans>Built from a git repository</Trans>)}
			</div>
			<label className='listing-field'>
				<span><Trans>Name</Trans></span>
				<input value={form.name} onChange={e => set('name', e.target.value)} maxLength={80} />
			</label>
			{repo && (
				<label className='listing-field'>
					<span><Trans>Repository</Trans></span>
					<input
						value={form.repoUrl}
						onChange={e => set('repoUrl', e.target.value)}
						placeholder='https://github.com/you/your-addon'
						maxLength={512}
					/>
				</label>
			)}
			<label className='listing-field'>
				<span><Trans>Description</Trans></span>
				<textarea
					className='listing-desc'
					value={form.description}
					onChange={e => set('description', e.target.value)} maxLength={500}
				/>
			</label>
			{!repo && <div className='listing-field-row'>
				<label className='listing-field'>
					<span><Trans>Version</Trans></span>
					<input
						value={form.version}
						onChange={e => set('version', e.target.value)}
						placeholder='1.0.0'
					/>
				</label>
				<label className='listing-field'>
					<span><Trans>Game version</Trans></span>
					<input value={form.gameVersion} onChange={e => set('gameVersion', e.target.value)} />
				</label>
			</div>}
			<div className='listing-field'>
				<span><Trans>Type</Trans></span>
				<span className='addon-types'>
					{AddonTypes.map(type => {
						const on = form.types.includes(type);
						return (
							<button
								key={type}
								className={`addon-type ${on ? 'is-active' : ''}`}
								aria-pressed={on}
								onClick={() => {
									const next = on ? form.types.filter(other => other !== type) : [...form.types, type];
									if (next.length) set('types', next);
								}}
							>
								{addonTypeLabel(type)}
							</button>
						);
					})}
				</span>
			</div>
			<label className='listing-field'>
				<span><Trans>Tags</Trans></span>
				<input
					value={form.tags}
					onChange={e => set('tags', e.target.value)}
					placeholder={t`comma, separated, tags`}
				/>
			</label>
			<IconField
				value={form.icon}
				onChange={icon => set('icon', icon)}
				iconUrl={addonIconUrl}
				upload={uploadAddonIcon}
			/>
		</>
	);
}
