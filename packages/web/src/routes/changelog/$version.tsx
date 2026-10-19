import {
	createFileRoute,
	notFound,
} from '@tanstack/react-router';
import { msg } from '@lingui/core/macro';
import { getGeneralStats } from '../../api/stats';
import ChangelogBuild from '../../pages/changelog/ChangelogBuild';

export const Route = createFileRoute('/changelog/$version')({
	// Imported here, not at the top: loaders stay in the main bundle.
	loader: async ({ params }) => {
		const { BUILDS } = await import('../../pages/changelog/builds');
		const index = BUILDS.findIndex(b => b.version === params.version);
		if (index < 0) throw notFound();
		return {
			index, online: await getGeneralStats().then(s => s.online, () => undefined),
		};
	},
	component: ChangelogBuildRoute,
	staticData: { title: msg`changelog` },
});

function ChangelogBuildRoute() {
	const { index, online } = Route.useLoaderData();
	return <ChangelogBuild index={index} online={online} />;
}
