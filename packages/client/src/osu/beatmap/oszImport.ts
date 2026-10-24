import {
	ph,
	t,
} from '@lingui/core/macro';
import {
	unzip,
	type Unzipped,
} from 'fflate';
import { BeatmapDecoder } from 'osu-parsers';
import * as ppjs from 'rosu-pp-js-web';
import { message } from '../../globals';
import rosuReady from '../rosu';
import BeatmapStore, { type SetRecord } from './beatmap_store';
import LightBeatmapSet from './LightBeatmapSet';
import { pickFile } from '../../pickFile';
import { unwrapArchive } from '@oss-idle/shared/osuSkin/files';

/** FNV-1a, 31 bits: stable across sessions, unlike any random id. */
const hash = (text: string): number => {
	let h = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
	return h & 0x7fffffff;
};

/** Negative, so it never meets a server id; derived from the map, so importing
 *  it again replaces it and keeps its local scores. */
const localId =(key: string): number => -(hash(key) || 1);

/** The local id a set's charts give it: by its BeatmapSetID when it has one (another map of
 *  the same song and mapper is another set), else by artist, title and mapper. */
type SetNames = { setId?: number, artist: string, title: string, creator: string };

export const localSetId = (map: SetNames) =>
	localId(map.setId && map.setId > 0
		? `set\n${map.setId}`
		: `${map.artist}\n${map.title}\n${map.creator}`);

/** Store an .osz from the player's own files as a local set. */
export const importOsz = async (data: Uint8Array): Promise<SetRecord> =>
	importFiles(unwrapArchive(await new Promise<Unzipped>((resolve, reject) => {
		unzip(data, (err, out) => (err ? reject(err) : resolve(out)));
	})));

/** Store an unpacked set as a local set, replacing the one it was imported as before,
 *  or the local set `id` when given. */
export const importFiles = async (files: Unzipped, setId?: number): Promise<SetRecord> => {
	const decoder = new TextDecoder();
	const charts = Object.keys(files)
		.filter(name => name.toLowerCase().endsWith('.osu'))
		.map(file => {
			const text = decoder.decode(files[file]);
			return {
				file, text, beatmap: new BeatmapDecoder().decodeFromString(text), 
			};
		});
	if (!charts.length) throw new Error('no .osu in the archive');

	const { artist, title, creator, beatmapSetId } = charts[0].beatmap.metadata;
	const id = setId ?? localSetId({
		setId: beatmapSetId, artist, title, creator,
	});
	await rosuReady();
	const versions = charts.map(({ file, text }) => ({
		id: localId(`${id}\n${file}`),
		file,
		difficulty: Math.round(new ppjs.Difficulty({ lazer: false })
			.calculate(new ppjs.Beatmap(text)).stars * 100) / 100,
	}));

	return BeatmapStore.storeOsz({
		id, artist, title, creator, versions,
	}, files, true);
};

const importFile = async (file: File): Promise<SetRecord | undefined> => {
	message.set(t`Importing ${ph({ name: file.name })}...`);
	try {
		const set = await importOsz(new Uint8Array(await file.arrayBuffer()));
		const { title } = set.metadata;
		message.set(LightBeatmapSet.fromMetadata(set.metadata).getPlayableBeatmaps().length
			? t`Imported ${ph({ title })}`
			: t`Imported ${ph({ title })}, but it has no 4K mania difficulty to play`);
		return set;
	} catch (e) {
		console.error('[oszImport] import failed', e);
		message.set(t`Could not import ${ph({ name: file.name })}`);
	}
};

/** Ask the player for an .osz and import it; undefined when they cancel or it fails. */
export const pickOsz = async (): Promise<SetRecord | undefined> => {
	const file = await pickFile('.osz');
	return file && importFile(file);
};

const isOsz = (file: File) => file.name.toLowerCase().endsWith('.osz');

window.addEventListener('dragover', e => {
	if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
});
window.addEventListener('drop', e => {
	const files = [...e.dataTransfer?.files ?? []];
	if (!files.length) return;
	e.preventDefault();
	void (async () => {
		for (const file of files.filter(isOsz)) await importFile(file);
	})();
});
