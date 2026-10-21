import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { getConnInfo } from '@hono/node-server/conninfo';
import { redis } from './redis';
import { redisKeyPrefix } from './env';

/** Who sent the request: the hop Apache appended to `X-Forwarded-For` (the earlier ones are
 *  whatever the client claimed), else the socket. */
const requestIp = (c: Context): string | undefined => {
	const forwarded = c.req.header('x-forwarded-for');
	if (forwarded) return forwarded.split(',').at(-1)?.trim();
	return getConnInfo(c).remote.address;
};

// dev reaches the API through the Vite proxy: every player would share one count
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

const ipKey = (c: Context) => {
	const ip = requestIp(c);
	return ip && !LOOPBACK.has(ip) ? ip : undefined;
};

/** At most `perMinute` requests a minute per IP (or per `keyOf`), across the cluster (Redis fixed windows). */
export const rateLimit = (
	name: string,
	perMinute: number,
	keyOf: (c: Context) => string | undefined = ipKey,
) => createMiddleware(async (c, next) => {
	const who = keyOf(c);
	if (who) {
		const key = `${redisKeyPrefix}rl:${name}:${who}:${Math.floor(Date.now() / 60_000)}`;
		const count = await redis.incr(key);
		if (count === 1) await redis.expire(key, 60);
		if (count > perMinute) {
			return c.json({ error: 'Too many requests, try again in a minute' }, 429, { 'Retry-After': '60' });
		}
	}
	await next();
});

/** At most `perDay` successful requests a day per signed-in account (behind requireAuth or requireActive). */
export const dailyLimit = (name: string, perDay: number) =>
	createMiddleware<{ Variables: { userId: number } }>(async (c, next) => {
		const key = `${redisKeyPrefix}daily:${name}:${c.get('userId')}:${Math.floor(Date.now() / 86_400_000)}`;
		// counted up front so parallel requests can't all pass, handed back on failure
		const count = await redis.incr(key);
		if (count === 1) await redis.expire(key, 86_400);
		if (count > perDay) {
			await redis.decr(key);
			return c.json({ error: `You can only do this ${perDay} times a day` }, 429);
		}
		await next();
		if (!c.res.ok) await redis.decr(key);
	});
