import { createFileRoute } from '@tanstack/react-router';
import { msg } from '@lingui/core/macro';
import { getGeneralStats } from '../../api/stats';
import Changelog from '../../pages/changelog/Changelog';

export const Route = createFileRoute('/changelog/')({
	loader: () => getGeneralStats().then(s => s.online, () => undefined),
	component: ChangelogRoute,
	staticData: { title: msg`changelog` },
});

function ChangelogRoute() {
	return <Changelog online={Route.useLoaderData()} />;
}
