import { createFileRoute } from '@tanstack/react-router';
import {
	fallback,
	zodValidator,
} from '@tanstack/zod-adapter';
import { z } from 'zod';
import { msg } from '@lingui/core/macro';
import { GROUPS } from '@oss-idle/shared/groups';
import GroupPage from '../../pages/groups/GroupPage';

const groupSearch = z.object({
	filter: fallback(z.enum(['all', 'online', 'offline']), 'all').default('all'),
	sort: fallback(z.enum(['active', 'rank', 'username']), 'active').default('active'),
});

export const Route = createFileRoute('/groups/$group')({
	params: { parse: ({ group }) => ({ group: z.enum(GROUPS).parse(group) }) },
	validateSearch: zodValidator(groupSearch),
	component: GroupRoute,
	staticData: { title: msg`groups` },
});

function GroupRoute() {
	const { group } = Route.useParams();
	const { filter, sort } = Route.useSearch();
	return <GroupPage group={group} filter={filter} sort={sort} />;
}
