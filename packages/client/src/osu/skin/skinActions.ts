import { normalizePath } from '@oss-idle/shared/osuSkin/files';
import type { SkinCreateBody } from '@oss-idle/shared/skin';
import { SkinDAO } from '../../db/schema/skin';
import {
	createSkin,
	getSkin,
	updateSkin,
	uploadSkinFiles,
	type Skin as SkinDTO,
} from '../../online/skins';
import { currentSkinDAO } from './Skin';
import {
	manifestOf,
	type SkinFiles,
} from './importSkin';
import {
	moveSkinFiles,
	putSkinFiles,
} from './skinFiles';
import {
	defaultFiles,
	downloadSkin,
	installedFiles,
	saveFile,
	zipOsk,
} from './skinInstall';

const osk = (files: SkinFiles) => zipOsk(Object.entries(files).map(([path, blob]) => ({
	path, read: async () => blob,
})));

const blobsOf = (files: SkinFiles) =>
	new Map(Object.entries(files).map(([path, blob]) => [normalizePath(path), blob]));

/** Install a catalog skin (all its files) and play with it. */
export const installSkin = async (dto: SkinDTO): Promise<void> => {
	const remote = await downloadSkin(dto.id);
	const installed = await SkinDAO.fromSkinDTO(remote).add();
	await installed.setEnabled(true);
};

/** Bring an installed catalog skin up to its latest files and listing. */
export const updateInstalledSkin = async (dao: SkinDAO): Promise<void> => {
	const remote = await downloadSkin(dao.id);
	await dao.update({
		name: remote.name,
		description: remote.description,
		version: remote.version,
		icon: remote.icon,
		status: remote.status,
		updatedAt: remote.updatedAt,
	});
	if (currentSkinDAO.get()?.id === dao.id) currentSkinDAO.set(dao);
};

/** Save the author's edits to their catalog skin, and its new files when given. */
export const saveOwnSkin = async (
	id: number, body: SkinCreateBody, files?: SkinFiles,
): Promise<void> => {
	await updateSkin(id, body);
	if (!files) return;
	await uploadSkinFiles(id, await osk(files));
	const installed = (await SkinDAO.getAll()).find(s => s.id === id);
	if (installed) await updateInstalledSkin(installed);
};

/** Put an imported skin in the catalog: it becomes the catalog skin, installed as it was. */
export const publishImported = async (
	dao: SkinDAO, body: SkinCreateBody, files?: SkinFiles,
): Promise<void> => {
	const created = await createSkin(body);
	const packed = files ? await osk(files) : await zipOsk(await installedFiles(dao.id));
	await uploadSkinFiles(created.id, packed);
	if (files) await putSkinFiles(created.id, manifestOf(files), blobsOf(files));
	else await moveSkinFiles(dao.id, created.id);
	const remote = await getSkin(created.id);
	// the files are already here: only their hashes are new
	await putSkinFiles(created.id, remote.files, new Map());
	const wasOn = currentSkinDAO.get()?.id === dao.id;
	await dao.delete();
	const installed = await SkinDAO.fromSkinDTO(remote).add();
	if (wasOn) await installed.setEnabled(true);
};

const oskName = (name: string) => `${name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'skin'}.osk`;

/** Save an installed skin as an .osk, as stable exports one. */
export const exportSkin = async (dao: SkinDAO): Promise<void> =>
	saveFile(await zipOsk(await installedFiles(dao.id)), oskName(dao.name));

/** Save the default skin as an .osk, to make a skin from. */
export const exportDefaultSkin = async (): Promise<void> =>
	saveFile(await zipOsk(defaultFiles()), oskName('oss!idle'));
