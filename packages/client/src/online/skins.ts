import type { InferResponseType } from 'hono/client';
import {
	apiUrl,
	BASE_URL,
	rpc,
	withAuth,
} from './client';
import { unwrap } from '@oss-idle/shared/apiBase';
import {
	SkinCreateBody,
	SkinUpdateBody,
} from '@oss-idle/shared/skin';
import { skinFileName } from '@oss-idle/shared/osuSkin/files';

/** One catalog/own skin as listed, inferred from the route. */
export type Skin = InferResponseType<typeof rpc.v1.skins.$get>[number];

/** A skin with its files, to view or install it. */
export type SkinWithFiles = InferResponseType<typeof rpc.v1.skins[':id']['$get']>;

/** A skin for display/editing, minus the catalog-only stats a local skin lacks. */
export type SkinDetail = Omit<Skin, 'downloads'>;

/** Where a catalog skin's file is served: by its content, so it caches forever. */
export const skinFileUrl = (hash: string, path: string): string =>
	`${BASE_URL}/skin-files/${skinFileName(hash, path)}`;

export const skinIconUrl = (
	icon: string | null | undefined,
): string | undefined =>
	icon ? apiUrl(icon) : undefined;

type BrowseQuery = {
	q?: string,
	tag?: string,
	sort?: 'created' | 'updated' | 'downloads',
	dir?: 'asc' | 'desc',
};

/** Public: browse the published catalog. */
export const browseSkins = (query: BrowseQuery = {}) =>
	unwrap<Skin[]>(rpc.v1.skins.$get({ query }));

/** Auth: record the caller's install (deduped per player); returns the new count. */
export const recordSkinDownload = (id: number) =>
	unwrap<{ downloads: number }>(
		rpc.v1.skins[':id'].download.$post({ param: { id: String(id) } }));

/** A single published (or own) skin, with its files. */
export const getSkin = (id: number) =>
	unwrap<SkinWithFiles>(rpc.v1.skins[':id'].$get({ param: { id: String(id) } }));

/** Owner: replace a skin's files with an .osk. */
export const uploadSkinFiles = async (id: number, osk: Blob): Promise<SkinWithFiles> => {
	const form = new FormData();
	form.append('file', osk, 'skin.osk');
	const res = fetch(`${BASE_URL}/v1/skins/${id}/files`, withAuth({
		method: 'PUT', body: form,
	}));
	return unwrap<SkinWithFiles>(res);
};

/** Auth: the caller's own skins (any status). */
export const mySkins = () =>
	unwrap<Skin[]>(rpc.v1.skins.me.$get());

/** Auth: create a draft skin. */
export const createSkin = (json: Partial<SkinCreateBody>) =>
	unwrap<Skin>(rpc.v1.skins.$post({ json: json as SkinCreateBody }));

/** Auth+owner: edit a skin. */
export const updateSkin = (id: number, json: SkinUpdateBody) =>
	unwrap<Skin>(rpc.v1.skins[':id'].$patch({
		param: { id: String(id) }, json, 
	}));

export const publishSkin = (id: number) => 
	unwrap<Skin>(rpc.v1.skins[':id'].submit.$post({ param: { id: String(id) } }));

/** Auth+owner: delete a skin. */
export const deleteSkin = (id: number) =>
	unwrap<{ ok: boolean }>(rpc.v1.skins[':id']
		.$delete({ param: { id: String(id) } }));

/** Auth: upload an icon image, returning its stored public path. */
export const uploadSkinIcon = async (file: File): Promise<string> => {
	const form = new FormData();
	form.append('file', file);
	const res = fetch(`${BASE_URL}/v1/skins/icon`,
		withAuth({
			method: 'POST', body: form, 
		}),
	);
	return (await unwrap<{ url: string }>(res)).url;
};
