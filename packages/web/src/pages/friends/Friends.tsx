import { Trans } from '@lingui/react/macro';
import useAsync from '@oss-idle/shared/hooks/useAsync';
import { getFriends } from '../../api/social';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import UserList, {
	type UserFilter,
	type UserSort,
} from '../../components/UserList';

export type Friend = Awaited<ReturnType<typeof getFriends>>[number];

/** osu!web's friends list: your friends, private to you. */
export default function Friends({ filter, sort }: { filter: UserFilter; sort: UserSort }) {
	const me = useCurrentUser();
	const friends = useAsync(() => me ? getFriends() : Promise.resolve([]), [me?.id]);

	if (!me) return <div className='page-contents'><Trans>Sign in to see your friends.</Trans></div>;
	if (!friends) return <div className='page-contents'><Trans>Loading…</Trans></div>;
	return <UserList users={friends} filter={filter} sort={sort} />;
}
