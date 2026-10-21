import { Hono } from 'hono';
import {
	getOnline,
	getPlaying,
} from '../play';
import { db } from '../db/client';
import { scores } from '../db/schema/score';
import { max } from 'drizzle-orm';
import { characters } from '../db/schema/character';
import { getStats } from '../stats';
import { VERSION } from '@oss-idle/shared/version';
import { requireAdmin } from '../auth/admin';
import {
	adoptionBreakdown,
	presenceCount,
} from '../ws/presence';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import {
	apiBaseUrl,
	env,
} from '../env';
import { timing } from '../metrics';
import {
	clientIp,
	continentOf,
} from '../geo';
import { rateLimit } from '../rateLimit';
import { dashboard } from '../dashboard';

/** The API origins players can be on: the API itself and its edges. */
const apiHosts = () => [apiBaseUrl, ...env.API_EDGES].map(url => new URL(url).host);

/** Round trips the game measured to each origin while picking the nearest. */
const rttBody = z.object({
	samples: z.array(z.object({
		host: z.string().max(100),
		ms: z.number().min(0).max(60_000),
	})).max(8),
});

export const statsRoutes = new Hono()
	.get('/general', async c => c.json({
		playing: await getPlaying(),
		online: await getOnline(),
		scores: (await db.select({ nb: max(scores.id) }).from(scores))[0].nb ?? 0,
		users: (await db.select({ nb: max(characters.id) }).from(characters))[0].nb ?? 0,
	}))
	.get('/recent', async c => c.json(await getStats()))
	.get('/version', async c => c.json(VERSION))
	.get('/admin', requireAdmin, async c => c.json({
		serverVersion: VERSION,
		online: await presenceCount(),
		playing: await getPlaying(),
		players: (await db.select({ nb: max(characters.id) }).from(characters))[0].nb ?? 0,
		scores: (await db.select({ nb: max(scores.id) }).from(scores))[0].nb ?? 0,
		adoption: await adoptionBreakdown(),
	}))
	.get('/admin/metrics', requireAdmin, async c => c.json(await dashboard(apiHosts())))
	.post('/rtt', rateLimit('rtt', 20), zValidator('json', rttBody), async c => {
		const hosts = apiHosts();
		const continent = await continentOf(clientIp(c)) ?? '??';
		for (const { host, ms } of c.req.valid('json').samples) {
			if (hosts.includes(host)) timing(`rtt:${host}`, ms, `${continent}:`);
		}
		return c.body(null, 204);
	})
;