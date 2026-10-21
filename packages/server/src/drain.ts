import type {
	Server,
	ServerResponse,
} from 'node:http';

/**
 * Once draining starts, every response closes its connection after it. One kept
 * alive past the drain dies with the worker while Apache sends on it, and that
 * request is a 502 (pm2 reloads cost a few each). Returns the switch.
 */
export const closeOnDrain = (server: Server) => {
	let draining = false;
	const responding = new Set<ServerResponse>();
	const closeAfter = (res: ServerResponse) => {
		if (!res.headersSent) res.setHeader('Connection', 'close');
	};
	// ahead of the app's listener, which may answer synchronously
	server.prependListener('request', (_req, res: ServerResponse) => {
		if (draining) closeAfter(res);
		responding.add(res);
		res.on('close', () => responding.delete(res));
	});
	return () => {
		draining = true;
		responding.forEach(closeAfter);
	};
};
