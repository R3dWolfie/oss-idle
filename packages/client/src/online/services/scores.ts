import { InferResponseType } from 'hono/client';
import { rpc } from '../client';
import MemCache from '@osu-idle/shared/storage/memcache';
import Character from '../../db/schema/character';
import { Score } from '../../db/schema/score';

const endpoint = rpc.v1.scores;

type ScoreResponse = InferResponseType<typeof endpoint[':id']['$get'], 200>;
type BeatmapBoardResponse = InferResponseType<typeof endpoint['beatmap'][':beatmap']['board']['$get'], 200>;
export type BoardPlayer = BeatmapBoardResponse[number]['player'];
type MyBeatmapScoreResponse = InferResponseType<typeof endpoint['beatmap'][':beatmap']['me']['$get'], 200>;

export const getScore = async (id: number): Promise<ScoreResponse> => {
	const res = await endpoint[':id'].$get({ param: { id: String(id) } });
	if (!res.ok) throw new Error(`getScore(${id}) failed: ${res.status}`);
	return res.json();
};

/** The signed-in character's own best on this beatmap + its rank, global or
 *  within a country (null when signed out or no play yet). */
export const getMyBeatmapScore = async (
	beatmap: number, 
	country?: string,
): Promise<MyBeatmapScoreResponse> => {
	const res = country === undefined
		? await endpoint['beatmap'][':beatmap']['me']
			.$get({ param: { beatmap: String(beatmap) } })
		: await endpoint['beatmap'][':beatmap']['country'][':country']['me']
			.$get({
				param: {
					beatmap: String(beatmap), country, 
				}, 
			});

	if (!res.ok)
		throw new Error(`getMyBeatmapScore(${beatmap}) failed: ${res.status}`);
	return res.json();
};

export const flushBeatmapScores = async (beatmap: number) => 
	MemCache.get<BeatmapBoardResponse>('API.getBeatmapScores')
		.delete(beatmap);

const importScores = (scores: BeatmapBoardResponse[number]['score'][]) => {
	void (async () => {
		for (const score of scores) {
			const char = await Character.get(score.characterId);
			if (!char) continue;
			const local = await Score.getByOnlineId(score.id);
			if (local) continue;
			Score.fromDTO(score).add();
		}
	})();
};

/** A map's leaderboard, global or within a country, each best with who set it. */
export const getBeatmapScores = async (
	beatmap: number,
	country?: string,
): Promise<BeatmapBoardResponse> => {
	return MemCache.get<BeatmapBoardResponse>('API.getBeatmapScores')
		.process(country ? `${beatmap}:${country}` : beatmap, async () => {
			const res = await endpoint['beatmap'][':beatmap']['board'].$get({
				param: { beatmap: String(beatmap) },
				query: { country },
			});
			if (!res.ok) throw new Error(`getBeatmapScores(${beatmap}, ${country}) failed: ${res.status}`);
			const rows: BeatmapBoardResponse = await res.json();
			importScores(rows.map(r => r.score));
			return rows;
		}, 1000 * 60);
};

/** A character's latest score on a beatmap, if any. */
export const getLatestScore = async (characterId: number, beatmapId: number) => {
	const res = await endpoint.character[':character'].beatmap[':beatmap'].latest.$get({
		param: {
			character: String(characterId), beatmap: String(beatmapId),
		},
	});
	return res.ok ? res.json() : undefined;
};
