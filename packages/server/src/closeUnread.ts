import type { HttpBindings } from '@hono/node-server';
import { createMiddleware } from 'hono/factory';

/**
 * An answer sent before the request body arrived (a 429 or 413 on an upload) says
 * `Connection: close`. Otherwise Apache pools the connection while the adapter is still
 * draining the body, and the next player's request on it dies with a 502 when the
 * adapter gives up and drops the socket.
 */
export const closeUnread = createMiddleware(async (c, next) => {
	await next();
	// tests call the app without a node server, and websocket upgrades have no outgoing
	const env = c.env as Partial<HttpBindings> | undefined;
	if (env?.outgoing && env.incoming?.complete === false) c.header('Connection', 'close');
});
