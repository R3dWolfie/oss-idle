import { Hono } from 'hono';
import { httpMetrics } from './metrics';
import { closeUnread } from './closeUnread';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { sql } from 'drizzle-orm';
import { db } from './db/client';
import { redis } from './redis';
import { rateLimit } from './rateLimit';
import { HTTPException } from 'hono/http-exception';
import { serveStatic } from '@hono/node-server/serve-static';
import { ZodError } from 'zod';
import {
	clientUrl,
	DESKTOP_ORIGIN,
	LEGACY_CLIENT_URL,
	isProd,
} from './env';
import { i18nMiddleware } from './i18n';
import { reportError } from './discord/error';
import { __ } from '@oss-idle/shared/i18n/translate';
import {
	UPLOAD_DIR,
	UPLOAD_ROUTE,
} from './uploads';
import { usersRoutes } from './routes/users';
import { authRoutes } from './routes/auth';
import { meRoutes } from './routes/me';
import { proxyRoutes } from './routes/proxy';
import { newsRoutes } from './routes/news';
import { scoresRoutes } from './routes/scores';
import { medalsRoutes } from './routes/medals';
import { charactersRoutes } from './routes/characters';
import { statsRoutes } from './routes/stats';
import { chatRoutes } from './routes/chat';
import { rankingRoutes } from './routes/ranking';
import { beatmapsRoutes } from './routes/beatmap';
import { addonsRoutes } from './routes/addons';
import { skinsRoutes } from './routes/skins';
import { matchesRoutes } from './routes/matches';
import { socialRoutes } from './routes/social';
import { storeRoutes } from './routes/store';
import { teamRoutes } from './routes/team';
import { groupsRoutes } from './routes/groups';
import { restrictionsRoutes } from './routes/restrictions';
import { accountsRoutes } from './routes/accounts';
import { oauthRoutes } from './routes/oauth';
import { tokenRoutes } from './oauth';
import { apiV2Routes } from './api/v2';

// The desktop app loads its bundle from a registered `app://` scheme, so it
// calls us from that origin (Bearer-authed, no cookie). In dev also accept the
// web app's own Vite origin (port 5174) - it's normally reached through the
// game's /web proxy (CLIENT_URL), but opening it directly is common while
// iterating on the web platform. Prod stays locked to CLIENT_URL + the app.
const allowedOrigins = isProd
	? [clientUrl, LEGACY_CLIENT_URL, DESKTOP_ORIGIN]
	: [clientUrl, DESKTOP_ORIGIN, 'http://localhost:5173', 'http://localhost:5174'];

const MB = 1024 * 1024;

const TOKEN_QUERY = /([?&]token=)[^&\s]+/;

/** How big a request body may be: an admin's .osz upload, an image, or anything else. */
const bodyCap = (path: string): number => {
	if (path === '/v1/beatmap/nomination') return 200 * MB;
	if (/\/(icon|avatar|banner|image)$/.test(path)) return 6 * MB;
	return 2 * MB;
};

/** Up when both MySQL and Redis answer. */
const healthy = async (): Promise<boolean> => {
	try {
		await Promise.all([db.execute(sql`SELECT 1`), redis.ping()]);
		return true;
	} catch {
		return false;
	}
};

// Versioned API surface. Mount future feature routers here.
const v1 = new Hono()
	.route('/stats', statsRoutes)
	.route('/users', usersRoutes)
	.route('/beatmap', beatmapsRoutes)
	.route('/characters', charactersRoutes)
	.route('/ranking', rankingRoutes)
	.route('/scores', scoresRoutes)
	.route('/auth', authRoutes)
	.route('/me', meRoutes)
	.route('/news', newsRoutes)
	.route('/chat', chatRoutes)
	.route('/addons', addonsRoutes)
	.route('/skins', skinsRoutes)
	.route('/medals', medalsRoutes)
	.route('/social', socialRoutes)
	.route('/matches', matchesRoutes)
	.route('/store', storeRoutes)
	.route('/restrictions', restrictionsRoutes)
	.route('/team', teamRoutes)
	.route('/groups', groupsRoutes)
	.route('/accounts', accountsRoutes)
	.route('/oauth', oauthRoutes)
	.route('/proxy', proxyRoutes)
;

// Built as one chained expression so the route schema is captured in the type
// of `app`; `AppType` is then consumed by the client's typed RPC client to
// match the API's exact request/response types with no duplication.
const app = new Hono()
	// the admin dashboard's request volume, status and timing (metrics.ts)
	.use('*', httpMetrics)
	.use('*', closeUnread)
	// the desktop app's websocket carries its session in the query
	.use('*', logger((line, ...rest) => console.log(line.replace(TOKEN_QUERY, '$1-'), ...rest)))
	// Apache only deflates text/html-ish types, so JSON left uncompressed: the
	// catalog was 441 KB a load (64 KB gzipped). Binary payloads are skipped.
	.use('*', compress())
	.use('*', cors({
		origin: allowedOrigins, credentials: true,
		// a browser asks again for every call otherwise: a whole round trip far from the API
		maxAge: 86400,
	}))
	// uploads and previews are loaded from the game's other origins (and the desktop app)
	.use('*', secureHeaders({ crossOriginResourcePolicy: 'cross-origin' }))
	.use('*', (c, next) => bodyLimit({
		maxSize: bodyCap(c.req.path),
		onError: () => c.json({ error: 'Request too large' }, 413),
	})(c, next))
	.use('*', i18nMiddleware)
	// a ranking page alone is ~110 calls, and a household shares one IP
	.use('/v1/*', rateLimit('api', 6000))
	// the OAuth round-trips
	.use('/v1/auth/osu/login', rateLimit('auth', 60))
	.use('/v1/auth/osu/desktop/exchange', rateLimit('auth', 60))
	.use('/v1/auth/osu/callback', rateLimit('auth', 60))
	.use('/v1/auth/discord/callback', rateLimit('auth', 60))
	.use('/v1/auth/move', rateLimit('auth', 60))
	.use('/v1/auth/move/redeem', rateLimit('auth', 60))
	.get('/health', async c => await healthy()
		? c.json({ status: 'ok' })
		: c.json({ status: 'down' }, 503))
	// Serve uploaded media (news cover images) from disk.
	.use(`${UPLOAD_ROUTE}/*`, serveStatic({
		root: UPLOAD_DIR,
		rewriteRequestPath: path => path.replace(new RegExp(`^${UPLOAD_ROUTE}`), ''),
	}))
	.route('/v1', v1);

// The public API, at osu!'s paths. Kept out of `AppType`: no app of ours calls it.
app
	.use('/oauth/token', rateLimit('oauth-token', 120))
	.route('/oauth', tokenRoutes)
	.route('/api/v2', apiV2Routes);

// pass the request-scoped i18n: only it has an active locale on the server
app.notFound(c => c.json({ error: __('Not found', undefined, undefined, c.get('i18n')) }, 404));

app.onError((err, c) => {
	if (err instanceof HTTPException) {
		return c.json({ error: err.message }, err.status);
	}
	if (err instanceof ZodError) {
		return c.json({
			error: 'Validation failed', issues: err.issues, 
		}, 400);
	}
	console.error(err);
	reportError(err, c);
	return c.json({ error: 'Internal server error' }, 500);
});

export { app };

/** The shape of the API, consumed by the client's RPC client for end-to-end types. */
export type AppType = typeof app;
