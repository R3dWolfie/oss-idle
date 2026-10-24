import Synced from '@oss-idle/shared/helpers/synced';
import {
	Column,
	DAO,
	DB,
	integer,
	table,
	text,
} from '../dao';

const playlist = table('playlist', {
	id:        integer().primaryKey().autoincrement(),
	name:      text(),
	createdAt: integer(),
});

// in play order; a difficulty can sit in a playlist more than once, each copy
// with how many times it plays in a row. No rate follows the mod (stored as 0).
const playlistEntry = table('playlist_entry', {
	id:         integer().primaryKey().autoincrement(),
	playlistId: integer(),
	beatmapId:  integer(),
	rate:       new Column<number | undefined>('REAL', v => v ?? 0, v => (v as number) || undefined)
		.default(undefined),
	position:   integer(),
	repeat:     integer().default(1),
}, { indexes: { idx_playlist_entry_beatmap: 'beatmapId' } });

/** Bumped on every playlist mutation so live views (the song-select grouping,
 *  the manage overlay) re-query instead of holding stale lists. */
export const playlistsVersion = new Synced(0);
const touch = () => playlistsVersion.set(playlistsVersion.get() + 1);

export class PlaylistEntry extends DAO(playlistEntry) {}

export class Playlist extends DAO(playlist) {

	static byName(name: string): Promise<Playlist | undefined> {
		return this.first('SELECT * FROM playlist WHERE name = ?', [name]);
	}

	static async create(name: string): Promise<Playlist> {
		const p = await new Playlist({
			name, createdAt: Date.now(), 
		}).add();
		touch();
		return p;
	}

	async rename(name: string): Promise<void> {
		await this.update({ name });
		touch();
	}

	async deleteWithEntries(): Promise<void> {
		await DB.run('DELETE FROM playlist_entry WHERE playlistId = ?', [this.id]);
		await this.delete();
		touch();
	}

	/** At the end. `rate` locks the entry at it; without one it follows the mod. */
	async addBeatmap(beatmapId: number, rate?: number, repeat = 1): Promise<void> {
		const last = await PlaylistEntry.first(
			'SELECT * FROM playlist_entry WHERE playlistId = ? ORDER BY position DESC LIMIT 1', [this.id],
		);
		await new PlaylistEntry({
			playlistId: this.id, beatmapId, rate, repeat, position: (last?.position ?? 0) + 1,
		}).add();
		touch();
	}

	/** Every copy of it. */
	async removeBeatmap(beatmapId: number, rate?: number): Promise<void> {
		await DB.run(
			'DELETE FROM playlist_entry WHERE playlistId = ? AND beatmapId = ? AND rate = ?',
			[this.id, beatmapId, rate ?? 0],
		);
		touch();
	}
}

/** A difficulty's place in a playlist, at the rate it is locked at if any. */
export interface PlaylistMembership {
	id: number;
	name: string;
	rate?: number;
	entry: PlaylistSlot;
}

/** One copy of a difficulty in a playlist. */
export interface PlaylistSlot {
	id: number;
	position: number;
	repeat: number;
}

/** Everything the playlist views need in one read: the playlists (A→Z), each
 *  one's map count, and which playlists every difficulty belongs to. */
export interface PlaylistIndex {
	playlists: Playlist[];
	counts: Map<number, number>;
	byBeatmap: Map<number, PlaylistMembership[]>;
}

export async function getPlaylistIndex(): Promise<PlaylistIndex> {
	const playlists = (await Playlist.getAll())
		.sort((a, b) => a.name.localeCompare(b.name));
	const entries = await PlaylistEntry.query('SELECT * FROM playlist_entry ORDER BY position');
	const byId = new Map(playlists.map(p => [p.id, p]));
	const counts = new Map<number, number>();
	const byBeatmap = new Map<number, PlaylistMembership[]>();
	for (const e of entries) {
		const p = byId.get(e.playlistId);
		if (!p) continue;
		counts.set(p.id, (counts.get(p.id) ?? 0) + 1);
		let list = byBeatmap.get(e.beatmapId);
		if (!list) byBeatmap.set(e.beatmapId, list = []);
		list.push({
			id: p.id, name: p.name, rate: e.rate, entry: {
				id: e.id, position: e.position, repeat: e.repeat,
			},
		});
	}
	return {
		playlists, counts, byBeatmap, 
	};
}
