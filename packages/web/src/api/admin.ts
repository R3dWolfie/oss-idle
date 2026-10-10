import {
	rpc,
	unwrap,
} from './client';

/** Admin dashboard: live server + player stats, including version adoption. */
export const getAdminStats = () => unwrap(rpc.v1.stats.admin.$get());

/** Dashboard payload, inferred from the route. */
export type AdminStats = Awaited<ReturnType<typeof getAdminStats>>;

/** Every medal with its rule, holders and who already qualifies. */
export const getAdminMedals = () => unwrap(rpc.v1.medals.admin.$get());
export type AdminMedals = Awaited<ReturnType<typeof getAdminMedals>>;
