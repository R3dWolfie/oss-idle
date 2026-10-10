import { GoodGrade } from '@osu-idle/shared/judgement';
import { SkillSort } from '../components/leaderboard/PlayerSkillLeaderboard';
import {
	rpc,
	unwrap,
} from './client';

/** `?friends=1`: only the signed-in player and their friends. */
const friendsQuery = (friends?: boolean) => friends ? { friends: '1' as const } : {};

/** Countries that have at least one player, most populated first. */
export const getCountries = () =>
	unwrap(rpc.v1.ranking.countries.$get());

export const getGlobalRanking = (page: number = 1, friends?: boolean) =>
	unwrap(rpc.v1.ranking.global[':page'].$get({
		param: { page: String(page) }, query: friendsQuery(friends),
	}));

export const getCountryGlobalRanking = (country: string, page: number = 1, friends?: boolean) =>
	unwrap(rpc.v1.ranking.global.country[':country'][':page'].$get({
		param: {
			country, page: String(page), 
		},
		query: friendsQuery(friends),
	}));

export const getScoreRanking = (page: number = 1, friends?: boolean) =>
	unwrap(rpc.v1.ranking.score[':page'].$get({
		param: { page: String(page) }, query: friendsQuery(friends),
	}));

export const getCountryScoreRanking = (country: string, page: number = 1, friends?: boolean) =>
	unwrap(rpc.v1.ranking.score.country[':country'][':page'].$get({
		param: {
			country, page: String(page), 
		},
		query: friendsQuery(friends),
	}));

export const getSkillRanking = (skill: SkillSort, page: number = 1, friends?: boolean) =>
	unwrap(rpc.v1.ranking.skill[':skill'].page[':page'].$get({
		param: {
			skill, page: String(page), 
		},
		query: friendsQuery(friends),
	}));

export const getCountrySkillRanking = (
	skill: SkillSort,
	country: string,
	page: number = 1,
	friends?: boolean,
) =>
	unwrap(rpc.v1.ranking.skill[':skill'].country[':country'].page[':page'].$get({
		param: {
			skill, page: String(page), country, 
		},
		query: friendsQuery(friends),
	}));

/** The same skills ranked on what they have ever earned. */
export const getLifetimeRanking = (skill: SkillSort, page: number = 1, friends?: boolean) =>
	unwrap(rpc.v1.ranking.lifetime[':skill'].page[':page'].$get({
		param: {
			skill, page: String(page),
		},
		query: friendsQuery(friends),
	}));

export const getCountryLifetimeRanking = (
	skill: SkillSort,
	country: string,
	page: number = 1,
	friends?: boolean,
) =>
	unwrap(rpc.v1.ranking.lifetime[':skill'].country[':country'].page[':page'].$get({
		param: {
			skill, country, page: String(page),
		},
		query: friendsQuery(friends),
	}));

/** How many times each skill has been prestiged. */
export const getPrestigeRanking = (skill: SkillSort, page: number = 1, friends?: boolean) =>
	unwrap(rpc.v1.ranking.prestige[':skill'].page[':page'].$get({
		param: {
			skill, page: String(page),
		},
		query: friendsQuery(friends),
	}));

export const getCountryPrestigeRanking = (
	skill: SkillSort,
	country: string,
	page: number = 1,
	friends?: boolean,
) =>
	unwrap(rpc.v1.ranking.prestige[':skill'].country[':country'].page[':page'].$get({
		param: {
			skill, country, page: String(page),
		},
		query: friendsQuery(friends),
	}));

export const getGradesRanking = (grade: GoodGrade | 'all', page: number = 1, friends?: boolean) =>
	unwrap(rpc.v1.ranking.grades[':grade'].page[':page'].$get({
		param: {
			grade, page: String(page), 
		},
		query: friendsQuery(friends),
	}));

export const getCountryGradesRanking = (
	grade: GoodGrade | 'all', 
	country: string,
	page: number = 1,
	friends?: boolean,
) =>
	unwrap(rpc.v1.ranking.grades[':grade'].country[':country'].page[':page'].$get({
		param: {
			grade, page: String(page), country, 
		},
		query: friendsQuery(friends),
	}));

/** Countries ranked on the summed pp of their players. */
export const getCountryRanking = (page: number = 1) =>
	unwrap(rpc.v1.ranking.country[':page'].$get({ param: { page: String(page) } }));

/** The highest pp plays across every player. */
export const getTopPlays = (page: number = 1, friends?: boolean) =>
	unwrap(rpc.v1.ranking.plays[':page'].$get({
		param: { page: String(page) }, query: friendsQuery(friends),
	}));
