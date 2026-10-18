import { createFileRoute } from '@tanstack/react-router';
import {
	fallback,
	zodValidator,
} from '@tanstack/zod-adapter';
import { z } from 'zod';
import { msg } from '@lingui/core/macro';
import Search from '../pages/search/Search';

const searchSearch = z.object({ q: fallback(z.string(), '').default('') });

export const Route = createFileRoute('/search')({
	validateSearch: zodValidator(searchSearch),
	component: SearchRoute,
	staticData: { title: msg`search` },
});

function SearchRoute() {
	return <Search q={Route.useSearch().q} />;
}
