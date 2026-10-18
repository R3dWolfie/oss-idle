import { createFileRoute } from '@tanstack/react-router';
import {
	fallback,
	zodValidator,
} from '@tanstack/zod-adapter';
import { z } from 'zod';
import { msg } from '@lingui/core/macro';
import Store from '../pages/store/Store';

const storeSearch = z.object({
	tab: fallback(z.enum(['products', 'orders']), 'products').default('products'),
	paid: z.coerce.number().optional(),
});

export const Route = createFileRoute('/store')({
	validateSearch: zodValidator(storeSearch),
	component: StoreRoute,
	staticData: { title: msg`store` },
});

function StoreRoute() {
	const { tab, paid } = Route.useSearch();
	return <Store tab={tab} paid={Boolean(paid)} />;
}
