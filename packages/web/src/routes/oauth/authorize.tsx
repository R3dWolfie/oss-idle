import { createFileRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';
import { msg } from '@lingui/core/macro';
import Authorize from '../../pages/oauth/Authorize';

const authorizeSearch = z.object({
	client_id: z.coerce.number().int().positive().optional().catch(undefined),
	redirect_uri: z.string().optional().catch(undefined),
	scope: z.string().optional().catch(undefined),
	state: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/oauth/authorize')({
	validateSearch: zodValidator(authorizeSearch),
	component: AuthorizeRoute,
	staticData: { title: msg`authorization request` },
});

function AuthorizeRoute() {
	return <Authorize {...Route.useSearch()} />;
}
