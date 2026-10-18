import { createFileRoute } from '@tanstack/react-router';
import {
	fallback,
	zodValidator,
} from '@tanstack/zod-adapter';
import { z } from 'zod';
import { msg } from '@lingui/core/macro';
import { getMapset } from '../../api/maps';
import BeatmapsetPage from '../../pages/beatmaps/BeatmapsetPage';

const mapSearch = z.object({
	diff: z.coerce.number().int().optional().catch(undefined),
	board: fallback(z.enum(['global', 'country', 'friends']), 'global').default('global'),
});

export const Route = createFileRoute('/maps/$id')({
	validateSearch: zodValidator(mapSearch),
	loader: ({ params }) => getMapset(params.id),
	component: MapRoute,
	staticData: { title: msg`beatmap info` },
});

function MapRoute() {
	const mapset = Route.useLoaderData();
	const { diff, board } = Route.useSearch();
	return <BeatmapsetPage mapset={mapset} diffId={diff} board={board} />;
}
