import { Trans } from '@lingui/react/macro';
import type { SkillName } from '@oss-idle/shared/skills';
import { extractSkills } from '@oss-idle/shared/osu/level';
import type { getCharacter } from '../../api/characters';
import { SkillBar } from './SkillBar';

/** The profile's Skills block: overall level, then each skill. */
export default function CharacterSkills({ character }: {
	character: Awaited<ReturnType<typeof getCharacter>>;
}) {
	return <div className='character__block character__block-skills'>
		<div className='character__block-title'><Trans>Skills</Trans></div>
		<div className='main-skill'><SkillBar skill={'overall' as SkillName} progress={{
			level: character.overallLevel, xp: character.overallXp,
			lifetimeXp: character.overallLifetimeXp,
		}} /></div>
		<ul className='skills'>
			{Object.entries(extractSkills(character))
				.map(([skill, progress]) => <SkillBar
					key={skill}
					skill={skill as SkillName}
					progress={progress}
				/>)}
		</ul>
	</div>;
}
