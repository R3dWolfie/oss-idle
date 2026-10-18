import { createFileRoute } from '@tanstack/react-router';
import { msg } from '@lingui/core/macro';
import { getScore } from '../../api/scores';
import ScorePage from '../../pages/scores/ScorePage';

export const Route = createFileRoute('/scores/$id')({
	loader: ({ params }) => getScore(params.id),
	component: ScoreRoute,
	staticData: { title: msg`score info` },
});

function ScoreRoute() {
	return <ScorePage show={Route.useLoaderData()} />;
}
