import '../pages/friends/Friends.css';
import './leaderboard/PlayerLeaderboard.css';
import type { ReactNode } from 'react';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import Link from './Link';
import FriendChip from '../pages/friends/FriendChip';
import type { getFriends } from '../api/social';

export type UserCard = Omit<Awaited<ReturnType<typeof getFriends>>[number], 'mutual'> & {
	mutual?: boolean;
};
export type UserFilter = 'all' | 'online' | 'offline';
export type UserSort = 'active' | 'rank' | 'username';

const lastActive = (u: UserCard) => u.online ? Infinity : Date.parse(u.lastActiveAt ?? '') || 0;

const SORTS: Record<UserSort, (a: UserCard, b: UserCard) => number> = {
	active: (a, b) => lastActive(b) - lastActive(a),
	rank: (a, b) => (a.character.rank ?? Infinity) - (b.character.rank ?? Infinity),
	username: (a, b) => a.character.name.localeCompare(b.character.name),
};

/** osu!web's user list (friends, a group): All / Online / Offline, sorted, as compact chips.
 *  `children` sits above the sort bar. */
export default function UserList({ users, filter, sort, children }: {
	users: UserCard[];
	filter: UserFilter;
	sort: UserSort;
	children?: ReactNode;
}) {
	const { t } = useLingui();
	const online = users.filter(u => u.online).length;
	const counters: { filter: UserFilter; label: string; count: number }[] = [
		{
			filter: 'all', label: t`All`, count: users.length,
		},
		{
			filter: 'online', label: t`Online`, count: online,
		},
		{
			filter: 'offline', label: t`Offline`, count: users.length - online,
		},
	];
	const shown = users
		.filter(u => filter === 'all' || u.online === (filter === 'online'))
		.sort(SORTS[sort]);
	const sorts: { sort: UserSort; label: string }[] = [
		{
			sort: 'active', label: t`Recently active`,
		},
		{
			sort: 'rank', label: t`Rank`,
		},
		{
			sort: 'username', label: t`Username`,
		},
	];

	return (<>
		<div className='friends__counters'>
			{counters.map(c => (
				<Link
					key={c.filter}
					to='.'
					search={{
						filter: c.filter, sort,
					}}
					className='friends__counter'
					data-filter={c.filter}
					data-active={filter === c.filter}
				>
					{c.label}
					<b>{c.count}</b>
				</Link>
			))}
		</div>
		<div className='page-contents friends__body'>
			{children}
			<div className='player__lb_sort friends__sort'>
				<span><Trans>Sort by</Trans></span>
				{sorts.map(s => (
					<Link
						key={s.sort}
						to='.'
						search={{
							filter, sort: s.sort,
						}}
						className={sort === s.sort ? 'current' : ''}
					>{s.label}</Link>
				))}
			</div>
			<div className='friends__list'>
				{shown.map(u => <FriendChip key={u.userId} friend={u} />)}
			</div>
		</div>
	</>);
}
