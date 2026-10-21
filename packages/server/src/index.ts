import { backfillRateStars } from './beatmaps/rateStars';
import { serve } from '@hono/node-server';
import type { Server } from 'node:http';
import { appendFile } from 'node:fs/promises';
import Logfile from '@oss-idle/shared/helpers/logfile';
import { app } from './app';
import { closeOnDrain } from './drain';
import {
	env,
	isProd,
	port,
} from './env';
import { separateStagingMapIds } from './beatmaps/storage';
import { redis } from './redis';
import { sweepDuePlays } from './play';
import {
	roundsStarted,
	sweepMatches,
} from './ws/multiplayer';
import { sweepRankedMaps } from './beatmaps/sweep';
import {
	ensureRankings,
	sweepRankHistory,
} from './rankings';
import { registerWs } from './ws/routes';
import { hub } from './ws/hub';
import { countLoggedErrors } from './metrics';
import { startMonitor } from './monitor';
import {
	sweepAdoption,
	sweepPresence,
} from './ws/presence';
import { activateServerI18n } from './i18n';
import { sweepAbby } from './abby';

activateServerI18n();

// the sweeps and socket heartbeats are fire-and-forget: a database or Redis blip in
// one must not end the worker, and every socket it holds with it
process.on('unhandledRejection', e => console.error('[unhandled]', e));

Logfile.setWriter(lines => appendFile('runtime.log', lines.join('\n') + '\n'));

// Community WebSocket: mount the route on the app and start the pub/sub fan-out.
const { injectWebSocket } = registerWs(app);
countLoggedErrors();
hub.init();

const server = serve({
	fetch: app.fetch, port, hostname: env.LISTEN_HOST,
}, info => {
	console.log(`🎵 oss!idle API listening on http://localhost:${info.port}`);
});

// outlives Apache's pooled backend connections (ProxyPass ttl=60): otherwise Node closes an
// idle one just as Apache reuses it, and that request is a 502
(server as Server).keepAliveTimeout = 65_000;
const drain = closeOnDrain(server as Server);
injectWebSocket(server);

// Staging shares prod's beatmap files: its new maps count from 2e9, prod's from 1e9.
if (!isProd) void separateStagingMapIds();


// Build the Redis ranking index from MySQL when it is missing or no longer
// matches it (one cluster worker wins the lock; the rest return immediately).
void ensureRankings();

// Stars at every rate for the difficulties ingested before rates existed.
void backfillRateStars();

// Finalise plays whose end time has passed even if no client ever returns to
// finish them - the server is authoritative. Safe on every worker: the atomic
// claim in finalizePlay guarantees a single submit.
const sweep = setInterval(() => void sweepDuePlays(), 3_000);
sweep.unref();

// End finished match rounds and free the seats of players who went offline.
const matchSweep = setInterval(() => void sweepMatches(), 3_000);
matchSweep.unref();

// Announce scheduled maps whose rank time has passed (no redeploy needed).
const rankSweep = setInterval(() => void sweepRankedMaps(), 30_000);
rankSweep.unref();

// Record every character's daily global rank sample (one worker wins the
// per-day lock; later ticks return immediately).
void sweepRankHistory();
const rankHistorySweep = setInterval(() => void sweepRankHistory(), 15 * 60_000);
rankHistorySweep.unref();

// Prune presence entries left behind by a crashed worker / unclean disconnect.
const presenceSweep = setInterval(() => void sweepPresence(), 30_000);
presenceSweep.unref();

// Drop version reports from players who haven't reconnected within the adoption
// window, so builds they've churned off stop being counted.
const adoptionSweep = setInterval(() => void sweepAdoption(), 10 * 60_000);
adoptionSweep.unref();

// Book the supporter orders past their refund window in Abby.
const abbySweep = setInterval(() => void sweepAbby(), 60 * 60_000);
abbySweep.unref();

// The dashboard's minute checks of every service prod depends on.
const monitor = startMonitor();

/**
 * Drain on a clean shutdown (systemd stop / restart, Ctrl-C, tsx-watch reload,
 * pm2 reload): stop taking requests, send the sockets to another worker, and close
 * Redis only once the requests in flight and the sockets' goodbyes are done.
 */
const shutdown = (signal: string): void => {
	console.log(`\n${signal} received - shutting down.`);
	[sweep, matchSweep, rankSweep, rankHistorySweep, presenceSweep, adoptionSweep, abbySweep, monitor]
		.forEach(clearInterval);
	hub.closeAll();
	drain();
	server.close(() => void roundsStarted().then(() => {
		setTimeout(() => void redis.quit().finally(() => process.exit(0)), 1000);
	}));
	if ('closeIdleConnections' in server) server.closeIdleConnections();
	// Don't hang forever if a connection refuses to drain.
	setTimeout(() => process.exit(0), 6000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
