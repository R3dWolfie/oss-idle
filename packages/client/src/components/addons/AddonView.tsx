import { useState } from 'react';
import { Trans } from '@lingui/react/macro';
import {
	ADDON_KIND,
	ADDON_TEMPLATE,
	ADDON_TYPE,
	type AddonKind,
	type AddonType,
} from '@oss-idle/shared/addon';
import { VERSION } from '@oss-idle/shared/version';
import {
	createAddon,
	updateAddon,
	type Addon,
	type OwnAddon,
} from '../../online/addons';
import AddonEditMeta, { type AddonForm } from './AddonEditMeta';
import AddonCodePane from './AddonCodePane';
import AddonRepoPane from './AddonRepoPane';
import AddonReadMeta from './AddonReadMeta';
import PageBarActions from '../page/PageBarActions';
import {
	editorBarActions,
	type PageAction,
} from '../page/pageBar';

/**
 * Normalised add-on info:
 * the display values (view) and initial values (edit).
 */
export type AddonDetail = {
	name: string,
	authorName: string,
	version: string,
	gameVersion: string,
	description: string,
	tags: string[],
	types: AddonType[],
	icon: string | null,
	source: string,
	kind: AddonKind,
	repoUrl?: string,
	tag?: string,
	commit?: string,
};

/** Build a detail view-model from a catalog/own add-on DTO. */
export const detailOfDTO = (a: Addon): AddonDetail => ({
	name: a.name,
	authorName: a.authorName,
	version: a.version,
	gameVersion: a.gameVersion,
	description: a.description,
	tags: a.tags,
	types: a.types,
	icon: a.icon,
	source: a.source,
	kind: a.kind,
	repoUrl: a.repoUrl,
	tag: a.tag,
	commit: a.commit,
});

/** Blank values for creating a new add-on. */
export const newAddonDetail = (): AddonDetail => ({
	name: '',
	authorName: '',
	version: '0.1.0',
	gameVersion: VERSION,
	description: '',
	tags: [],
	types: [ADDON_TYPE.gameplay],
	icon: null,
	source: ADDON_TEMPLATE,
	kind: ADDON_KIND.inline,
});

const formOf = (detail: AddonDetail): AddonForm => ({
	name: detail.name,
	description: detail.description,
	tags: detail.tags.join(', '),
	types: detail.types,
	version: detail.version,
	gameVersion: detail.gameVersion ?? VERSION,
	icon: detail.icon,
	kind: detail.kind,
	repoUrl: detail.repoUrl ?? '',
});

const bodyOf = (form: AddonForm, source: string) => ({
	name: form.name.trim(),
	description: form.description.trim(),
	tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
	types: form.types,
	version: form.version.trim(),
	gameVersion: form.gameVersion.trim(),
	icon: form.icon,
	source,
	kind: form.kind,
	repoUrl: form.kind === ADDON_KIND.repo ? form.repoUrl.trim() : undefined,
});

type EditAddonprops = {
	mode: 'edit',
	addon?: OwnAddon,
	onSaved: (addon: OwnAddon) => void
};

type ViewAddonprops = { 
	mode: 'view', 
	diffAgainst?: string,
	actions?: PageAction[]
};

type Props = {
	detail: AddonDetail,
	onBack: () => void,
} & (
	| EditAddonprops
	| ViewAddonprops
);

/**
 * The single add-on view, shared by the editor, details, install preview and
 * update diff. Metadata sits on the left (editable inputs in edit mode, a
 * read-only summary otherwise), the code on the right; the back/return action
 * lives in the button row so it stays reachable.
 */
export default function AddonView(props: Props) {
	const { detail, onBack } = props;
	const editing = props.mode === 'edit';
	const own = props.mode === 'edit' ? props.addon : undefined;
	const diffAgainst = props.mode === 'view' ? props.diffAgainst : undefined;
	const viewActions = props.mode === 'view' ? props.actions : undefined;

	const [form, setForm] = useState(() => formOf(detail));
	const set = <K extends keyof AddonForm>(key: K, value: AddonForm[K]) =>
		setForm(f => ({
			...f, [key]: value,
		}));
	const [source, setSource] = useState(detail.source);
	const [repoAddon, setRepoAddon] = useState(own);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | undefined>();
	const repo = form.kind === ADDON_KIND.repo;

	const save = async () => {
		if (props.mode !== 'edit') return;
		setBusy(true);
		setError(undefined);
		const body = bodyOf(form, source);
		try {
			props.onSaved(own
				? await updateAddon(own.id, body)
				: await createAddon(body));
		} catch (e) {
			setError(String((e as Error).message ?? e));
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className='listing-view'>
			<div className='listing-view__cols'>
				<div className='listing-view__meta'>
					{editing
						? <AddonEditMeta form={form} set={set} />
						: <AddonReadMeta detail={detail} />}
				</div>

				<div className='listing-field listing-field--code'>
					{editing && repo
						? <AddonRepoPane addon={repoAddon} onChange={setRepoAddon} />
						: <AddonCodePane
							editing={editing}
							source={editing ? source : detail.source}
							onChange={setSource}
							diffAgainst={diffAgainst}
						/>}
				</div>
			</div>

			{editing && (
				<p className='listing-view__notice'>
					<Trans>Published add-on code must be licensed under the AGPLv3 (or a compatible licence), regardless of its source code's license.</Trans>
				</p>
			)}
			{error && <div className='page__error'>{error}</div>}

			<PageBarActions 
				actions={editorBarActions({
					editing,
					busy,
					canSave: !!form.name.trim() && (!repo || !!form.repoUrl.trim()),
					onBack, 
					onSave: save, 
					viewActions, 
				})}
			/>
		</div>
	);
}
