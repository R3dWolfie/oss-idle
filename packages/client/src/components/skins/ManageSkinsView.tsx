import {
	useEffect,
	useMemo,
	useState,
} from 'react';
import { Trans } from '@lingui/react/macro';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import { useAction } from '@oss-idle/shared/hooks/useAction';
import Auth from '../../online/auth';
import PageBarActions from '../page/PageBarActions';
import { useHasUpdate } from '../listing/useHasUpdate';
import {
	installedSkins,
	type SkinDAO,
} from '../../db/schema/skin';
import {
	deleteSkin,
	getSkin,
	mySkins,
	publishSkin,
	Skin as SkinDTO,
} from '../../online/skins';
import { getManifest } from '../../osu/skin/skinFiles';
import {
	installedSource,
	remoteSource,
} from '../../osu/skin/sources';
import {
	readFolder,
	readOsk,
	importSkin,
	type SkinFiles,
} from '../../osu/skin/importSkin';
import {
	exportDefaultSkin,
	exportSkin,
	installSkin,
	publishImported,
	saveOwnSkin,
	updateInstalledSkin,
} from '../../osu/skin/skinActions';
import {
	pickFile,
	pickFolder,
} from '../../pickFile';
import SkinView, { type SkinContent } from './SkinView';
import MySkinRow from './MySkinRow';
import SkinDAORow from './SkinDAORow';
import DefaultSkinRow from './DefaultSkinRow';

type Open =
	| { kind: 'edit', skin: SkinDTO, content: SkinContent }
	| { kind: 'publish', skin: SkinDAO, content: SkinContent }
	| { kind: 'details', skin: SkinDAO, content: SkinContent };

const installedContent = async (id: number): Promise<SkinContent> => ({
	files: await getManifest(id) ?? [],
	source: (await installedSource(id)) ?? {
		paths: [], read: async () => undefined, 
	},
});

export default function ManageSkinsView() {
	const [user] = useSynced(Auth.user);
	const [installed] = useSynced(installedSkins);
	const [open, setOpen] = useState<Open | undefined>();
	const [mine, setMine] = useState<SkinDTO[]>([]);
	const {
		busy, error, setError, run: act,
	} = useAction();

	const refreshMine = () => {
		if (!user) { setMine([]); return Promise.resolve(); }
		return mySkins().then(setMine).catch(e => setError(String(e.message ?? e)));
	};
	useEffect(() => { void refreshMine(); }, [user]);

	const catalog = useMemo(() => installed.filter(s => !s.local), [installed]);
	const hasUpdate = useHasUpdate(catalog, getSkin);
	const run = (fn: () => Promise<unknown>) => act(fn, refreshMine);
	const close = () => setOpen(undefined);

	const importFrom = (read: () => Promise<[SkinFiles, string] | undefined>) => run(async () => {
		const picked = await read();
		if (!picked) return;
		const dao = await importSkin(...picked);
		await dao.setEnabled(true);
	});
	const fromOsk = async (): Promise<[SkinFiles, string] | undefined> => {
		const file = await pickFile('.osk,.zip');
		if (!file) return undefined;
		const files = await readOsk(new Uint8Array(await file.arrayBuffer()));
		return [files, file.name.replace(/\.(osk|zip)$/i, '')];
	};
	const fromFolder = async (): Promise<[SkinFiles, string] | undefined> => {
		const files = await pickFolder();
		return files.length ? [readFolder(files), files[0].webkitRelativePath.split('/')[0]] : undefined;
	};

	if (open?.kind === 'edit') {
		return <SkinView
			editing={true}
			detail={open.skin}
			content={open.content}
			onBack={close}
			onSave={async (body, files) => {
				await saveOwnSkin(open.skin.id, body, files);
				close();
				void refreshMine();
			}}
		/>;
	}
	if (open?.kind === 'publish') {
		return <SkinView
			editing={true}
			detail={{
				name: open.skin.name,
				description: '',
				tags: [],
				version: '1.0.0',
				icon: null,
			}}
			content={open.content}
			onBack={close}
			onSave={async (body, files) => {
				await publishImported(open.skin, body, files);
				close();
				void refreshMine();
			}}
		/>;
	}
	if (open?.kind === 'details') {
		return <SkinView detail={open.skin.toDetail()} content={open.content} onBack={close} />;
	}

	return (
		<>
			<div className='page__section'><Trans>Installed</Trans></div>
			<div className='page__list'>
				<DefaultSkinRow busy={busy} onExport={() => run(exportDefaultSkin)} />
				{installed.map(a => (
					<SkinDAORow
						key={a.id}
						skin={a}
						busy={busy}
						hasUpdate={hasUpdate(a)}
						canPublish={!!user && a.local}
						onToggle={enabled => run(() => a.setEnabled(enabled))}
						onDetails={() => run(async () => setOpen({
							kind: 'details', skin: a, content: await installedContent(a.id),
						}))}
						onUpdate={() => run(() => updateInstalledSkin(a))}
						onPublish={() => run(async () => setOpen({
							kind: 'publish', skin: a, content: await installedContent(a.id),
						}))}
						onExport={() => run(() => exportSkin(a))}
						onUninstall={() => run(() => a.uninstall())}
					/>
				))}
			</div>

			{user && <>
				<div className='page__section'><Trans>Your published skins</Trans></div>
				{mine.length === 0 && <p className='page__muted'>
					<Trans>Import an osu! skin, then publish it from the list above.</Trans>
				</p>}
				<div className='page__list'>
					{mine.map(a => (
						<MySkinRow
							key={a.id}
							skin={a}
							busy={busy}
							onEdit={() => run(async () => {
								const { files } = await getSkin(a.id);
								setOpen({
									kind: 'edit', skin: a, content: {
										files, source: remoteSource(files),
									},
								});
							})}
							onSubmit={() => run(() => publishSkin(a.id))}
							onInstall={() => run(() => installSkin(a))}
							onDelete={() => run(() => deleteSkin(a.id))}
						/>
					))}
				</div>
			</>}

			{error && <div className='page__error'>{error}</div>}

			<PageBarActions actions={[
				{
					id: 'import-osk',
					label: <Trans>Import an .osk</Trans>,
					onClick: () => void importFrom(fromOsk),
					disabled: busy,
					order: 10,
				},
				{
					id: 'import-folder',
					label: <Trans>Import a skin folder</Trans>,
					onClick: () => void importFrom(fromFolder),
					disabled: busy,
					order: 11,
				},
			]} />
		</>
	);
}
