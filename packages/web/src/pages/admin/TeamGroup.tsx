import {
	GROUP_BADGE,
	type Group,
} from '@oss-idle/shared/groups';
import Link from '../../components/Link';
import ProfilePicture from '../../components/ProfilePicture';
import GroupBadge from '../../components/character/GroupBadge';
import type { TeamMember } from '../../api/team';

/** One group of the team page and its members. */
export default function TeamGroup({ group, members, busy, onRemove }: {
	group: Group;
	members: TeamMember[];
	busy: boolean;
	onRemove: (userId: number) => Promise<void>;
}) {
	return <section>
		<h3>
			<GroupBadge group={group} /> {GROUP_BADGE[group].name}
			{' '}<span className='team-group__count'>{members.length}</span>
		</h3>
		{group === 'admin' && <p className='admin-medals__meta'>The owner is always an admin.</p>}
		{!members.length && <p className='admin-medals__meta'>Nobody yet.</p>}
		<ul className='team-group__members'>
			{members.map(m => <li key={m.userId} className='team-member'>
				<ProfilePicture avatarUrl={m.avatarUrl} className='team-member__avatar' />
				{m.characterId
					? <Link to='/c/$id' params={{ id: String(m.characterId) }} className='team-member__name'>
						{m.name}
					</Link>
					: <span className='team-member__name'>{m.username}</span>}
				<span className='team-member__meta'>
					{m.username} · since {new Date(m.since).toLocaleDateString()}
				</span>
				<span className='team-member__actions'>
					<button type='button' disabled={busy} onClick={() => void onRemove(m.userId)}>Remove</button>
				</span>
			</li>)}
		</ul>
	</section>;
}
