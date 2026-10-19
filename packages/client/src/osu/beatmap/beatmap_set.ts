import '@oss-idle/shared/osu/controlPointPatch';
import { Beatmap } from 'osu-classes';
import BeatmapAPI from './beatmap_api';
import BeatmapStore, { SetRecord } from './beatmap_store';
import { BeatmapDecoder } from 'osu-parsers';
import LightBeatmapSet from './LightBeatmapSet';

export default class BeatmapSet {

	private record?: SetRecord;
	
	constructor(
		public id: number,
	) {}

	private async getRecord(): Promise<SetRecord> {
		const existing = this.record
			??= await BeatmapStore.getSet(this.id);

		if (existing) return existing;
		
		const metadata = (await BeatmapAPI.getManifest())
			.beatmaps.find(m => m.id === this.id);

		if (!metadata) {
			throw new Error(`Tried to get set with invalid id ${this.id}`);
		}

		return BeatmapAPI.downloadOsz(metadata);				
	}

	private _beatmaps?: Promise<Record<number, Beatmap>>;
	get beatmaps(): Promise<Record<number, Beatmap>> {
		return this._beatmaps ??= this.getRecord().then(r => Object.entries(r.osu)
			.reduce((set, [id, text]) => {
				const beatmap = (new BeatmapDecoder()).decodeFromString(text);
				// the catalog's ids, over whatever an older stored file says
				beatmap.metadata.beatmapId = Number(id);
				beatmap.metadata.beatmapSetId = this.id;
				set[Number(id)] = beatmap;
				return set;
			}, {} as Record<number, Beatmap>),
		);
	}

	public static async getIntro(): Promise<LightBeatmapSet> {
		const intro = (await BeatmapAPI.getManifest()).intro;
		if (!intro) throw new Error('Intro beatmap is not available');
		return LightBeatmapSet.fromMetadata(
			(await BeatmapAPI.downloadOsz(intro)).metadata,
		);
	}

}