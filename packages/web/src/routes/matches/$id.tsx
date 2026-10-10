import { createFileRoute } from '@tanstack/react-router';
import { msg } from '@lingui/core/macro';
import { getMatch } from '../../api/matches';
import MatchHistory from '../../pages/matches/MatchHistory';

export const Route = createFileRoute('/matches/$id')({
	loader: ({ params }) => getMatch(params.id),
	component: MatchRoute,
	staticData: { title: msg`match history` },
});

function MatchRoute() {
	return <MatchHistory match={Route.useLoaderData()} />;
}
