import {
	useEffect,
	useMemo,
	useState,
} from 'react';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import PageBarActions from '../page/PageBarActions';
import {
	editorBarActions,
	type PageAction,
} from '../page/pageBar';
import {
	type SkinCreateBody,
	type SkinFile,
	skinUpdateBody,
} from '@oss-idle/shared/skin';
import { z } from 'zod';
import {
	type SkinDetail,
	skinIconUrl,
	uploadSkinIcon,
} from '../../online/skins';
import type { SkinSource } from '../../osu/skin/OsuSkin';
import { memorySource } from '../../osu/skin/sources';
import {
	manifestOf,
	readFolder,
	readOsk,
	type SkinFiles,
} from '../../osu/skin/importSkin';
import {
	pickFile,
	pickFolder,
} from '../../pickFile';
import IconField from '../listing/IconField';
import SkinReadMeta from './SkinReadMeta';
import GameplayPreview from './GameplayPreview';
import SkinContents from './SkinContents';
import { useSourceSkin } from './useSourceSkin';

/** A skin's files and where to read them. */
export type SkinContent = { files: SkinFile[], source: SkinSource };

type Props = {
	detail: SkinDetail | (SkinCreateBody & { authorName?: string }),
	/** its files, once known */
	content?: SkinContent,
	editing?: boolean,
	actions?: PageAction[],
	onBack: () => void,
	/** save the edits, and the files picked to replace the skin's own when there are */
	onSave?: (body: SkinCreateBody, files?: SkinFiles) => Promise<void>,
};

/** A skin: its listing, a gameplay preview and everything it holds; or the form to edit them. */
export default function SkinView({
	detail,
	content,
	editing,
	actions,
	onBack,
	onSave,
}: Props) {
	const { t } = useLingui();

	const [name, setName] = useState(detail.name);
	const [description, setDescription] = useState(detail.description);
	const [tags, setTags] = useState(detail.tags.join(', '));
	const [version, setVersion] = useState(detail.version);
	const [icon, setIcon] = useState(detail.icon);
	const [replacement, setReplacement] = useState<SkinFiles>();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | undefined>();

	const shown = useMemo<SkinContent | undefined>(() => replacement
		? {
			files: manifestOf(replacement), source: memorySource(replacement),
		}
		: content, [replacement, content]);
	const skin = useSourceSkin(shown?.source);
	useEffect(() => setError(undefined), [replacement]);

	const body = useMemo(() => ({
		name: name.trim(),
		description: description.trim(),
		tags: tags.split(',').map(s => s.trim()).filter(Boolean),
		version: version.trim(),
		icon,
	} satisfies SkinCreateBody), [name, description, tags, version, icon]);

	const validation = useMemo(() => {
		if (!editing) return undefined;
		const meta = skinUpdateBody.safeParse(body);
		return meta.success ? undefined : z.prettifyError(meta.error);
	}, [editing, body]);

	const run = async (fn: () => Promise<void>) => {
		setBusy(true);
		setError(undefined);
		try {
			await fn();
		} catch (e) {
			setError(String((e as Error).message ?? e));
		} finally {
			setBusy(false);
		}
	};

	const replaceFrom = (read: () => Promise<SkinFiles | undefined>) => run(async () => {
		const files = await read();
		if (files) setReplacement(files);
	});
	const fromOsk = async () => {
		const file = await pickFile('.osk,.zip');
		return file && readOsk(new Uint8Array(await file.arrayBuffer()));
	};
	const fromFolder = async () => {
		const files = await pickFolder();
		return files.length ? readFolder(files) : undefined;
	};

	return (
		<div className='listing-view'>
			<div className='listing-view__cols'>
				<div className='listing-view__meta skin-view__meta'>
					{editing ? (
						<>
							<label className='listing-field'>
								<span><Trans>Name</Trans></span>
								<input value={name} onChange={e => setName(e.target.value)} maxLength={80} />
							</label>
							<label className='listing-field'>
								<span><Trans>Description</Trans></span>
								<textarea
									className='listing-desc'
									value={description}
									onChange={e => setDescription(e.target.value)} maxLength={500}
								/>
							</label>
							<div className='listing-field-row'>
								<label className='listing-field'>
									<span><Trans>Version</Trans></span>
									<input
										value={version}
										onChange={e => setVersion(e.target.value)}
										placeholder='1.0.0'
									/>
								</label>
							</div>
							<label className='listing-field'>
								<span><Trans>Tags</Trans></span>
								<input
									value={tags}
									onChange={e => setTags(e.target.value)}
									placeholder={t`comma, separated, tags`}
								/>
							</label>
							<IconField
								value={icon}
								onChange={setIcon}
								iconUrl={skinIconUrl}
								upload={uploadSkinIcon}
							/>
							<div className='listing-field'>
								<span><Trans>Skin files</Trans></span>
								<div className='skin-view__replace'>
									<button className='listing-btn' disabled={busy} onClick={() => void replaceFrom(fromOsk)}>
										<Trans>Replace from an .osk</Trans>
									</button>
									<button className='listing-btn' disabled={busy} onClick={() => void replaceFrom(fromFolder)}>
										<Trans>Replace from a folder</Trans>
									</button>
								</div>
							</div>
							{validation && (
								<div className='skin-view__validation'>
									<span><Trans>Validation errors</Trans></span>
									<pre>{validation}</pre>
								</div>
							)}
						</>
					) : <SkinReadMeta skin={detail} />}

					<div className='skin-view__preview'>
						<span><Trans>Preview</Trans></span>
						<GameplayPreview skin={skin} />
					</div>
				</div>

				<div className='listing-field skin-view__contents'>
					<span className='listing-view__codelabel'><Trans>Contents</Trans></span>
					{skin?.osu && shown
						? <SkinContents osu={skin.osu} files={shown.files} />
						: <p className='page__muted'><Trans>Loading…</Trans></p>}
				</div>
			</div>

			{error && <div className='page__error'>{error}</div>}

			<PageBarActions
				actions={[
					...(actions ? actions : []),
					...editorBarActions({
						editing,
						busy,
						canSave: !!name.trim() && !validation && !!(replacement ?? content),
						onBack,
						onSave: () => void run(() => onSave!(body, replacement)),
					}),
				]}
			/>
		</div>
	);
}
