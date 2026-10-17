import {
	existsSync,
	readFileSync,
} from 'node:fs';
import { redisKeyPrefix } from '../env';
import { redis } from '../redis';
import { hub } from '../ws/hub';
import { ingestOsz } from './ingest';
import { oszPath } from './storage';

// ponytail: one-off, delete once it has run on prod.
/** Ranked sets whose difficulties without an osu! id an older ingest skipped. */
const SKIPPED = [518412, 1216777];
const DONE = `${redisKeyPrefix}maps:recovered:1`;

/** Adds those difficulties once, on whichever worker gets there first. */
export const recoverSkippedDifficulties = async () => {
	if (!await redis.set(DONE, '1', 'NX')) return;
	try {
		for (const id of SKIPPED) {
			if (existsSync(oszPath(id))) await ingestOsz(readFileSync(oszPath(id)), { allowRanked: true });
		}
		hub.broadcast({ type: 'catalog:invalidate' });
	} catch (e) {
		console.error('Recovering skipped difficulties failed:', e);
		await redis.del(DONE);
	}
};
