import './Friends.css';
import '../../components/leaderboard/PlayerLeaderboard.css';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import useAsync from '@osu-idle/shared/hooks/useAsync';
import Link from '../../components/Link';
import FriendChip from './FriendChip';
import { getFriends } from '../../api/social';
import { useCurrentUser } from '../../hooks/useCurrentUser';

export type Friend = Awaited<ReturnType<typeof getFriends>>[number];
type Filter = 'all' | 'online' | 'offline';
type Sort = 'active' | 'rank' | 'username';

const lastActive = (f: Friend) => f.online ? Infinity : Date.parse(f.lastActiveAt ?? '') || 0;

const SORTS: Record<Sort, (a: Friend, b: Friend) => number> = {
	active: (a, b) => lastActive(b) - lastActive(a),
	rank: (a, b) => (a.character.rank ?? Infinity) - (b.character.rank ?? Infinity),
	username: (a, b) => a.character.name.localeCompare(b.character.name),
};

/** osu!web's friends list: your friends, private to you. */
export default function Friends({ filter, sort }: { filter: Filter; sort: Sort }) {
	const { t } = useLingui();
	const me = useCurrentUser();
	const friends = useAsync(() => me ? getFriends() : Promise.resolve([]), [me?.id]);

	if (!me) return <div className='page-contents'><Trans>Sign in to see your friends.</Trans></div>;
	if (!friends) return <div className='page-contents'><Trans>Loading…</Trans></div>;

	const online = friends.filter(f => f.online).length;
	const counters: { filter: Filter; label: string; count: number }[] = [
		{
			filter: 'all', label: t`All`, count: friends.length,
		},
		{
			filter: 'online', label: t`Online`, count: online,
		},
		{
			filter: 'offline', label: t`Offline`, count: friends.length - online,
		},
	];
	const shown = friends
		.filter(f => filter === 'all' || f.online === (filter === 'online'))
		.sort(SORTS[sort]);
	const sorts: { sort: Sort; label: string }[] = [
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
					to='/friends'
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
			<div className='player__lb_sort friends__sort'>
				<span><Trans>Sort by</Trans></span>
				{sorts.map(s => (
					<Link
						key={s.sort}
						to='/friends'
						search={{
							filter, sort: s.sort,
						}}
						className={sort === s.sort ? 'current' : ''}
					>{s.label}</Link>
				))}
			</div>
			<div className='friends__list'>
				{shown.map(f => <FriendChip key={f.userId} friend={f} />)}
			</div>
		</div>
	</>);
}
