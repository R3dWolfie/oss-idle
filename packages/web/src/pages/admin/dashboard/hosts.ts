/** A readable name for an API origin's host: the API itself is Europe, edges by their subdomain. */
export const serverName = (host: string, index: number) =>
	index === 0 ? `Europe (${host})` : `${host.split('.')[0].toUpperCase()} edge (${host})`;

/** Where a request came in, as the API saw it. */
export const VIA_NAME: Record<string, string> = {
	direct: 'Direct', na: 'NA edge', fr: 'FR edge', home: 'Home relay',
};
