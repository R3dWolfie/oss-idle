import { createFileRoute } from '@tanstack/react-router';
import { msg } from '@lingui/core/macro';
import { getProgressOverview } from '../../../../api/rankings';
import MedalProgress from '../../../../pages/rankings/MedalProgress';

export const Route = createFileRoute('/rankings/medals/progress/')({
	loader: () => getProgressOverview(),
	component: ProgressRoute,
	staticData: { title: msg`rankings` },
});

function ProgressRoute() {
	return <MedalProgress lines={Route.useLoaderData()} />;
}
