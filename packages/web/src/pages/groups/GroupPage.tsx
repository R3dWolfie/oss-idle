import './GroupPage.css';
import type { ReactNode } from 'react';
import { Trans } from '@lingui/react/macro';
import {
	GROUP_BADGE,
	type Group,
} from '@oss-idle/shared/groups';
import useAsync from '@oss-idle/shared/hooks/useAsync';
import { getGroupMembers } from '../../api/groups';
import UserList, {
	type UserFilter,
	type UserSort,
} from '../../components/UserList';

/** osu!web's group page: what the group does, then its members. */
export default function GroupPage({ group, filter, sort }: {
	group: Group;
	filter: UserFilter;
	sort: UserSort;
}) {
	const members = useAsync(() => getGroupMembers(group), [group]);
	const { name, colour } = GROUP_BADGE[group];
	const descriptions: Record<Group, ReactNode> = {
		admin: <Trans>
			The <b>Administrators</b> run oss!idle: they develop the game, rank the maps and manage
			the team.
		</Trans>,
		gmt: <Trans>
			The <b>Global Moderation Team</b> keeps the community a fun and welcoming place: they
			handle reports and moderate the chat, silencing or restricting players who break the rules.
		</Trans>,
	};

	if (!members) return <div className='page-contents'><Trans>Loading…</Trans></div>;
	return <UserList users={members} filter={filter} sort={sort}>
		<h2 className='group-page__title'>{name}</h2>
		<p className='group-page__description' style={{ '--group-colour': colour } as React.CSSProperties}>
			{descriptions[group]}
		</p>
	</UserList>;
}
