import { createFileRoute } from '@tanstack/react-router';
import {
	fallback,
	zodValidator,
} from '@tanstack/zod-adapter';
import { z } from 'zod';
import { msg } from '@lingui/core/macro';
import Friends from '../pages/friends/Friends';

const friendsSearch = z.object({
	filter: fallback(z.enum(['all', 'online', 'offline']), 'all').default('all'),
	sort: fallback(z.enum(['active', 'rank', 'username']), 'active').default('active'),
});

export const Route = createFileRoute('/friends')({
	validateSearch: zodValidator(friendsSearch),
	component: FriendsRoute,
	staticData: { title: msg`friends` },
});

function FriendsRoute() {
	const { filter, sort } = Route.useSearch();
	return <Friends filter={filter} sort={sort} />;
}
