import './CharacterPage.css';

import {
	getCharacter,
	getCharacterCountPlayed,
	getCharacterStats,
	saveProfileOrder,
} from '../../api/characters';
import { getUser } from '../../api/users';
import Flag from '../../components/Flag';
import RestrictedProfileNotice from '../../components/character/RestrictedProfileNotice';
import ProfilePicture from '../../components/ProfilePicture';
import EditableProfilePicture from '../../components/EditableProfilePicture';
import CharacterName from '../../components/character/CharacterName';
import CharacterTitle from '../../components/character/CharacterTitle';
import SupporterBadge from '../../components/character/SupporterBadge';
import GroupBadge from '../../components/character/GroupBadge';
import { GROUP_BADGE } from '@oss-idle/shared/groups';
import AccountStanding from '../../components/character/AccountStanding';
import ProfileBanner from '../../components/character/ProfileBanner';
import {
	refreshCurrentUser,
	useCurrentUser,
} from '../../hooks/useCurrentUser';
import {
	type ReactNode,
	useRef,
	useState,
} from 'react';
import {
	JUDGEMENT,
	Judgements,
} from '@oss-idle/shared/judgement';
import { showsDivine } from '@oss-idle/shared/rebirth';
import useAsync from '@oss-idle/shared/hooks/useAsync';
import num from '@oss-idle/shared/display/num';
import hitAccuracy from '@oss-idle/shared/osu/hitAccuracy';
import accuracy from '@oss-idle/shared/display/accuracy';
import Grade from '../../components/score/Grade';
import { headlineGrades } from './headlineGrades';
import { CharacterRanks } from '../../components/character/CharacterRanks';
import RankGraph from '../../components/character/RankGraph';
import CharacterMedals from '../../components/character/CharacterMedals';
import CharacterBeatmaps from '../../components/character/CharacterBeatmaps';
import CharacterSkills from '../../components/character/CharacterSkills';
import CharacterTopRanks from '../../components/character/CharacterTopRanks';
import CharacterHistorical from '../../components/character/CharacterHistorical';
import ProfileSocialBar from '../../components/character/ProfileSocialBar';
import ProfileTabs from '../../components/character/ProfileTabs';
import ProfileSection from '../../components/character/ProfileSection';
import UserPage from '../../components/character/UserPage';
import type { ProfileSection as Section } from '@oss-idle/shared/profile';
import { Trans } from '@lingui/react/macro';
import { countryName } from '@oss-idle/shared/display/country';
import { i18n } from '../../i18n';


type Character = Awaited<ReturnType<typeof getCharacter>>;
type Stats = Awaited<ReturnType<typeof getCharacterStats>>;

export default function CharacterPage({ id, character, stats }: {
	id: string;
	character: Character;
	stats: Stats;
}) {
	const user = useAsync(() => getUser(character.userId), [character]);

	const me = useCurrentUser();
	const isSelf = !!me && me.id === character.userId;
	// Once the player changes their own avatar, show the new one without a refetch.
	const [avatarOverride, setAvatarOverride] = useState<string | null>();
	const blocks = useRef<HTMLDivElement>(null);

	const countplayed = useAsync(() => getCharacterCountPlayed(id), [id]);

	const [order, setOrder] = useState(character.profileOrder);
	const supporter = Boolean(me?.supporter);
	const movable = isSelf && supporter;
	const move = (from: Section, to: Section) => {
		const next = order.filter(s => s !== from);
		next.splice(next.indexOf(to) + (order.indexOf(from) < order.indexOf(to) ? 1 : 0), 0, from);
		setOrder(next);
		void saveProfileOrder(character.id, next);
	};

	if (!user) return <main><Trans>Loading…</Trans></main>;

	const sections: Record<Section, ReactNode> = {
		me: <UserPage
			characterId={character.id}
			page={character.userPage}
			isSelf={isSelf}
			supporter={supporter}
		/>,
		skills: <CharacterSkills character={character} />,
		ranks: <CharacterTopRanks id={id} countplayed={countplayed} />,
		historical: <CharacterHistorical id={id} countplayed={countplayed} />,
		beatmaps: <CharacterBeatmaps id={id} />,
		medals: <CharacterMedals id={id} />,
	};

	return (
		<main>
			<RestrictedProfileNotice restricted={character.restricted} isSelf={isSelf} />
			<ProfileBanner key={id} bannerUrl={character.bannerUrl} editable={isSelf} />
			<div className='character__info'>
				{isSelf
					? <EditableProfilePicture
						avatarUrl={avatarOverride !== undefined ? avatarOverride : character.avatarUrl}
						className='character__avatar'
						onChange={url => { setAvatarOverride(url); void refreshCurrentUser(); }}
					/>
					: <ProfilePicture avatarUrl={character.avatarUrl} className='character__avatar' />}
				<div className='character__meta'>
					<div className='character__meta-up'>
						<div className='character__meta-name-row'>
							<CharacterName
								key={id}
								name={character.name}
								formerNames={character.formerNames}
								editable={isSelf}
							/>
							<SupporterBadge level={character.supportLevel} />
							{character.groups.map(g => <GroupBadge key={g} group={g} />)}
						</div>
						<CharacterTitle
							title={character.title ?? undefined}
							editable={isSelf}
							colour={character.groups[0] && GROUP_BADGE[character.groups[0]].colour}
						/>
					</div>
					<div className='character__meta-down'>
						<div className='character__meta-flag'><Flag country={user.country} /></div>
						<div className='character__meta-country'>{countryName(user.country, i18n.locale)}</div>
					</div>
				</div>
			</div>
			<div className='character__stats'>
				<div className='character__main_stats'>
					<CharacterRanks stats={stats} />
					<div className='character__graph'>
						{stats.rankHistory.length > 0 && <RankGraph ranks={stats.rankHistory} />}
					</div>
					<div className='character__totals'>
						<div className='character__totals_left'>
							<div className='character__totals-left-area'>
								<div className='character__totals-left-label'>pp</div>
								<div className='character__totals-left-num'>{num(Math.round(stats.pp))}</div>
							</div>
							<div className='character__totals-left-area'>
								<div className='character__totals-left-label'><Trans>Play Count</Trans></div>
								<div className='character__totals-left-num'>{num(stats.playCount)}</div>
							</div>
						</div>
						<div className='character__totals_grades'>
							{headlineGrades(stats).map(g => (
								<div key={g} className='character__grades-area'>
									<Grade grade={g} />
									<div className='character__grades-num'>{num(stats[g])}</div>
								</div>
							))}
						</div>
					</div>
				</div>
				<div className='character__stats_sep'></div>
				<div className='character__all_stats'>
					<div className='character__stats-area'>
						<div className='character__stats-label'><Trans>Ranked Score</Trans></div>
						<div className='character__stats-num'>{num(stats.rankedScore)}</div>
					</div>
					<div className='character__stats-area'>
						<div className='character__stats-label'><Trans>Hit Accuracy</Trans></div>
						<div className='character__stats-num'>{accuracy(hitAccuracy(stats))}</div>
					</div>
					<div className='character__stats-area'>
						<div className='character__stats-label'><Trans>Total Score</Trans></div>
						<div className='character__stats-num'>{num(stats.totalScore)}</div>
					</div>
					<div className='character__stats-area'>
						<div className='character__stats-label'><Trans>Total Hits</Trans></div>
						<div className='character__stats-num'>{num(stats.totalHits)}</div>
					</div>
					{Judgements
						.filter(j => j !== JUDGEMENT.DIVINE || showsDivine(stats[j]))
						.map(j => (
							<div key={j} className='character__stats-area'>
								<div className={`character__stats-label character__stats-judge judge-${j}`}>{j}</div>
								<div className='character__stats-num'>{num(stats[j])}</div>
							</div>
						))}
				</div>
			</div>
			<div className='character__submeta'>
			</div>
			<ProfileSocialBar
				userId={character.userId}
				characterId={character.id}
				name={character.name}
				restricted={character.restricted}
				groups={character.groups}
			/>
			<ProfileTabs blocks={blocks} />
			<div className='character__blocks' ref={blocks}>
				{order.map(section => <ProfileSection
					key={section}
					section={section}
					movable={movable}
					onMove={move}
				>
					{sections[section]}
				</ProfileSection>)}
				<AccountStanding userId={character.userId} name={character.name} />
			</div>
		</main>
	);
}