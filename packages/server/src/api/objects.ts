import { Skills } from '@oss-idle/shared/skills';
import {
	GoodGrades,
	Judgements,
	type Judgement,
} from '@oss-idle/shared/judgement';
import type { ScoreDTO } from '@oss-idle/shared/score';
import { mapCoverUrl } from '@oss-idle/shared/beatmap';
import { supportLevel } from '@oss-idle/shared/supporter';
import type { BeatmapRow } from '../db/schema/beatmap';
import type { BeatmapsetRow } from '../db/schema/beatmapset';
import {
	resolveAvatarUrl,
	resolveBannerUrl,
	type CharacterRow,
} from '../db/schema/character';
import type { CharacterTotalsRow } from '../db/schema/character_totals';
import type { UserRow } from '../db/schema/user';
import type { NewsRow } from '../db/schema/news';
import {
	apiBaseUrl,
	clientUrl,
} from '../env';

/** osu!'s API objects, in its snake_case, with the fields we have. */

const lower = <K extends string>(k: K) => k.toLowerCase() as Lowercase<K>;

export const statistics = (counts: Record<Judgement, number>) =>
	Object.fromEntries(Judgements.map(j => [lower(j), counts[j]])) as
		Record<Lowercase<Judgement>, number>;

const iso = (d: Date | null | undefined) => d?.toISOString();

/** `avatarUrl` already resolved (resolveAvatarUrl). */
type UserCompactInput = {
	userId: number;
	characterId: number;
	name: string;
	country: string;
	avatarUrl: string;
};

export const userCompact = (u: UserCompactInput) => ({
	id: u.userId,
	character_id: u.characterId,
	username: u.name,
	country_code: u.country,
	avatar_url: u.avatarUrl,
	profile_url: `${clientUrl}/web/c/${u.characterId}`,
});

const gradeCounts = (totals: CharacterTotalsRow) =>
	Object.fromEntries(GoodGrades.map(g => [lower(g), totals[g]])) as
		Record<Lowercase<typeof GoodGrades[number]>, number>;

export const userStatistics = (
	character: CharacterRow,
	totals: CharacterTotalsRow,
	ranks: { global?: number; country?: number },
) => ({
	pp: Number(character.pp),
	global_rank: ranks.global,
	country_rank: ranks.country,
	ranked_score: totals.rankedScore,
	total_score: totals.totalScore,
	play_count: totals.playCount,
	play_time: totals.playTime,
	total_hits: totals.hits,
	level: { current: character.overallLevel },
	grade_counts: gradeCounts(totals),
	statistics: statistics(totals),
});

export const apiUser = (
	user: UserRow,
	character: CharacterRow,
	totals: CharacterTotalsRow,
	ranks: { global?: number; country?: number },
) => {
	const supporter = Boolean(user.supporterUntil && user.supporterUntil > new Date());
	return {
		...userCompact({
			userId: user.id,
			characterId: character.id,
			name: character.name,
			country: user.country,
			avatarUrl: resolveAvatarUrl(character.avatarUrl, user.avatarUrl),
		}),
		cover_url: resolveBannerUrl(character.bannerUrl),
		title: character.title ?? undefined,
		generation: character.generation,
		is_supporter: supporter,
		support_level: supportLevel(supporter, user.supporterMonths),
		join_date: iso(user.createdAt),
		statistics: userStatistics(character, totals, ranks),
		skills: Object.fromEntries(Skills.map(s => [s, {
			level: character[`${s}Level`],
			prestige: character[`${s}Prestige`],
			upgrades: character[`${s}Upgrades`],
		}])),
		rank_history: {
			mode: 'mania', data: character.rankHistory?.ranks ?? [],
		},
	};
};

export const apiScore = (score: ScoreDTO) => ({
	id: score.id,
	character_id: score.characterId,
	beatmap_id: score.beatmapId,
	score: score.score,
	accuracy: score.accuracy,
	max_combo: score.maxCombo,
	rank: score.grade,
	pp: score.pp,
	perfect: score.pfc,
	rate: score.rate,
	statistics: statistics(score.judgements),
	ended_at: new Date(score.playedAt).toISOString(),
});

type BeatmapInput = Omit<BeatmapRow, 'chart'>;

export const apiBeatmap = (b: BeatmapInput) => ({
	id: b.id,
	osu_id: b.osuId ?? undefined,
	beatmapset_id: b.setId,
	version: b.version,
	difficulty_rating: Number(b.sr),
	mode: 'mania',
	status: 'ranked',
	cs: b.keys,
	bpm: b.bpm,
	total_length: Math.round(b.total_length / 1000),
	count_circles: b.rice,
	count_sliders: b.ln,
	playcount: b.plays,
	url: `${clientUrl}/web/maps/${b.setId}?diff=${b.id}`,
});

export const apiBeatmapset = (s: BeatmapsetRow, beatmaps: BeatmapInput[] = []) => ({
	id: s.id,
	osu_id: s.osuId ?? undefined,
	artist: s.artist,
	title: s.title,
	creator: s.creator,
	status: 'ranked',
	ranked_date: iso(s.rankedAt),
	submitted_date: iso(s.submittedAt),
	covers: {
		cover: mapCoverUrl({
			...s, background: beatmaps.find(b => b.background)?.background,
		}, 'cover', apiBaseUrl), 
	},
	url: `${clientUrl}/web/maps/${s.id}`,
	...beatmaps.length && { beatmaps: beatmaps.map(apiBeatmap) },
});

const absolute = (url: string) => /^https?:/.test(url) ? url : `${apiBaseUrl}${url}`;

export const apiNewsPost = (row: NewsRow, author: string, withContent = false) => ({
	id: row.id,
	slug: row.slug,
	title: row.title,
	author,
	tag: row.tag,
	preview: row.summary,
	first_image: row.imageUrl ? absolute(row.imageUrl) : undefined,
	published_at: iso(row.publishedAt),
	updated_at: iso(row.updatedAt),
	url: `${clientUrl}/web/news/${row.slug}`,
	...withContent && { content: row.content },
});
