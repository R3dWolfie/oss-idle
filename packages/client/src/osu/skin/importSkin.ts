import { t } from '@lingui/core/macro';
import { unzip } from 'fflate';
import {
	isSkinFile,
	normalizePath,
	unwrapArchive,
} from '@oss-idle/shared/osuSkin/files';
import {
	decodeIni,
	emptyIni,
	parseSkinIni,
} from '@oss-idle/shared/osuSkin/ini';
import {
	SKIN_FILES_MAX,
	SKIN_UNPACKED_MAX,
	type SkinFile,
} from '@oss-idle/shared/skin';
import { SkinDAO } from '../../db/schema/skin';
import { putSkinFiles } from './skinFiles';

/** A skin's files by name, as they will be stored. */
export type SkinFiles = Record<string, Blob>;

/** The files of an .osk, without what no skin holds (editor files, a .git folder, ...). */
export const readOsk = async (data: Uint8Array): Promise<SkinFiles> => {
	const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
		const filter = (file: { name: string, originalSize: number }) =>
			isSkinFile(file.name) && file.originalSize <= SKIN_UNPACKED_MAX;
		unzip(data, { filter }, (err, out) => (err ? reject(err) : resolve(out)));
	});
	return Object.fromEntries(Object.entries(unwrapArchive(files))
		.map(([name, bytes]) => [name, new Blob([bytes as Uint8Array<ArrayBuffer>])]));
};

/** The files of a picked skin folder, out of the folder itself. */
export const readFolder = (files: File[]): SkinFiles => unwrapArchive(Object.fromEntries(files
	.map(file => [file.webkitRelativePath || file.name, file] as const)
	.filter(([name]) => isSkinFile(name) && !name.split('/').some(part => part.startsWith('.')))));

/** A skin's name and author, from its skin.ini. */
export const skinInfo = async (files: SkinFiles) => {
	const ini = Object.entries(files).find(([name]) => normalizePath(name) === 'skin.ini')?.[1];
	if (!ini) return emptyIni().general;
	return parseSkinIni(decodeIni(new Uint8Array(await ini.arrayBuffer()))).general;
};

export const manifestOf = (files: SkinFiles): SkinFile[] => Object.entries(files)
	.map(([path, blob]) => ({
		path, size: blob.size,
	}));

const check = (files: SkinFiles) => {
	const entries = Object.values(files);
	if (!entries.length) throw new Error(t`There are no skin files in there`);
	if (entries.length > SKIN_FILES_MAX) throw new Error(t`That is too many files for a skin`);
	if (entries.reduce((total, blob) => total + blob.size, 0) > SKIN_UNPACKED_MAX) throw new Error(t`This skin is too big`);
};

/** Install a skin from the player's own files. Importing a skin of the same name again
 *  replaces it, like stable does. */
export const importSkin = async (files: SkinFiles, fallbackName: string): Promise<SkinDAO> => {
	check(files);
	const info = await skinInfo(files);
	const name = (info.name?.trim() || fallbackName).slice(0, 80);
	const installed = await SkinDAO.getAll();
	const same = installed.find(s => s.local && s.name === name);
	const id = same?.id ?? Math.min(0, ...installed.map(s => s.id)) - 1;
	const blobs = new Map(Object.entries(files).map(([path, blob]) => [normalizePath(path), blob]));
	await putSkinFiles(id, manifestOf(files), blobs);
	const now = new Date().toISOString();
	const dao = same ?? new SkinDAO({
		id,
		name,
		description: '',
		version: '1.0.0',
		icon: null,
		authorId: 0,
		authorName: info.author?.trim() ?? '',
		tags: '',
		status: 'UNPUBLISHED',
		enabled: false,
		installedAt: Date.now(),
		createdAt: now,
		publishedAt: null,
		updatedAt: now,
	});
	if (same) await same.update({
		authorName: info.author?.trim() ?? '', updatedAt: now,
	});
	else await dao.add();
	return dao;
};
