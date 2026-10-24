import { skillName } from '@oss-idle/shared/display/skills';
import type { getCharacterStats } from '../../api/characters';
import { Trans } from '@lingui/react/macro';
import RankArea from './RankArea';

type Stats = Awaited<ReturnType<typeof getCharacterStats>>;

export function CharacterRanks({ stats }: { stats: Stats }) {
	const skill = stats.bestSkill ? skillName(stats.bestSkill.skill) : '';
	const highest = stats.highestRanks;
	return (
		<div className='character__ranks'>
			<RankArea
				label={<Trans>Global Ranking</Trans>}
				current={stats.globalRank}
				highest={highest.pp}
				percent={stats.globalRankPercent}
			/>
			<RankArea
				label={<Trans>Country Ranking</Trans>}
				current={stats.countryRank}
				highest={highest.country}
			/>
			<RankArea label={<Trans>Score Ranking</Trans>} current={stats.scoreRank} highest={highest.score} />
			<RankArea
				label={<Trans>Skill Ranking</Trans>}
				current={stats.overallRank}
				highest={highest.overall}
			/>
			{stats.bestSkill && (
				<RankArea
					label={<Trans>{skill} Ranking</Trans>}
					current={stats.bestSkill.rank}
					highest={highest[stats.bestSkill.skill]}
				/>
			)}
		</div>
	);
}
