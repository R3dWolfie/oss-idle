import type { AddonType } from '@oss-idle/shared/addon';
import type { InferResponseType } from 'hono/client';
import type {
	AddonCreateBody,
	AddonUpdateBody,
} from '@oss-idle/shared/addon';
import {
	apiUrl,
	BASE_URL,
	rpc,
	withAuth,
} from './client';
import { unwrap } from '@oss-idle/shared/apiBase';

/** One catalog/own add-on as it crosses the wire, inferred from the route. */
export type Addon = InferResponseType<typeof rpc.v1.addons[':id']['$get']>;

/** One of the caller's own add-ons, with its repository webhook. */
export type OwnAddon = InferResponseType<typeof rpc.v1.addons.me.$get>[number];

export const addonIconUrl = (
	icon: string | null | undefined,
): string | undefined =>
	icon ? apiUrl(icon) : undefined;

type BrowseQuery = {
	q?: string,
	tag?: string,
	type?: AddonType,
	sort?: 'created' | 'updated' | 'downloads',
	dir?: 'asc' | 'desc',
};

/** Public: browse the published catalog. */
export const browseAddons = (query: BrowseQuery = {}) =>
	unwrap<Addon[]>(rpc.v1.addons.$get({ query }));

/** Auth: record the caller's install (deduped per player); returns the new count. */
export const recordAddonDownload = (id: number) =>
	unwrap<{ downloads: number }>(
		rpc.v1.addons[':id'].download.$post({ param: { id: String(id) } }));

/** Public: a single published add-on (incl source, for install). */
export const getAddon = (id: number) =>
	unwrap<Addon>(rpc.v1.addons[':id'].$get({ param: { id: String(id) } }));

/** Auth: the caller's own add-ons (any status). */
export const myAddons = () =>
	unwrap<OwnAddon[]>(rpc.v1.addons.me.$get());

/** Auth: create a draft add-on. */
export const createAddon = (json: Partial<AddonCreateBody>) =>
	unwrap<OwnAddon>(rpc.v1.addons.$post({ json: json as AddonCreateBody }));

/** Auth+owner: edit an add-on. */
export const updateAddon = (id: number, json: AddonUpdateBody) =>
	unwrap<OwnAddon>(rpc.v1.addons[':id'].$patch({
		param: { id: String(id) }, json,
	}));

/** Auth+owner: publish a draft add-on. */
export const submitAddon = (id: number) =>
	unwrap<OwnAddon>(rpc.v1.addons[':id'].submit.$post({ param: { id: String(id) } }));

/** Auth+owner: have a repo add-on's newest tag built. */
export const checkAddonRepo = (id: number) =>
	unwrap<OwnAddon>(rpc.v1.addons[':id'].check.$post({ param: { id: String(id) } }));

/** Auth+owner: a new webhook address; the old one stops working. */
export const renewAddonHook = (id: number) =>
	unwrap<OwnAddon>(rpc.v1.addons[':id']['hook-secret'].$post({ param: { id: String(id) } }));

/** Auth+owner: delete an add-on. */
export const deleteAddon = (id: number) =>
	unwrap<{ ok: boolean }>(rpc.v1.addons[':id']
		.$delete({ param: { id: String(id) } }));

/** Auth: upload an icon image, returning its stored public path. */
export const uploadAddonIcon = async (file: File): Promise<string> => {
	const form = new FormData();
	form.append('file', file);
	const res = fetch(`${BASE_URL}/v1/addons/icon`,
		withAuth({
			method: 'POST', body: form, 
		}),
	);
	return (await unwrap<{ url: string }>(res)).url;
};
