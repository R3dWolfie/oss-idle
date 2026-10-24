import {
	apiUrl,
	rpc,
	unwrap,
} from './client';
import type { AddonStatus } from '@oss-idle/shared/addon';

/** Admin: every published add-on, to take one down. */
export const listAddonsAdmin = () => unwrap(rpc.v1.addons.admin.$get());

/** One admin list row, inferred from the route. */
export type AdminAddon = Awaited<ReturnType<typeof listAddonsAdmin>>[number];

/** Admin: set an add-on's status. */
export const moderateAddon = (
	id: number,
	body: { status: AddonStatus },
) =>
	unwrap(rpc.v1.addons.admin[':id'].$patch({
		param: { id: String(id) }, json: body,
	}));

/** Resolve a stored icon path to a full URL for an <img>. */
export const addonIconUrl = (icon: string | null): string | undefined =>
	icon ? apiUrl(icon) : undefined;
