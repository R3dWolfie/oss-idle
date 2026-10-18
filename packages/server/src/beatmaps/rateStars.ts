import {
	eq,
	isNull,
} from 'drizzle-orm';
import { db } from '../db/client';
import { beatmaps } from '../db/schema/beatmap';
import { redis } from '../redis';
import { redisKeyPrefix } from '../env';
import { starsAtRates } from '../pp';

const LOCK = `${redisKeyPrefix}beatmaps:rate-stars`;

/** Fill in the stars at every rate of the difficulties ingested before rates,
 *  on one worker. A fraction of a second per difficulty, so it runs in the
 *  background and the song select shows base stars until it's through. */
export const backfillRateStars = async (): Promise<void> => {
	if (!await redis.set(LOCK, '1', 'EX', 3600, 'NX')) return;
	try {
		const missing = await db.select({ id: beatmaps.id })
			.from(beatmaps)
			.where(isNull(beatmaps.rateStars));
		for (const { id } of missing) {
			const [row] = await db.select({ chart: beatmaps.chart }).from(beatmaps).where(eq(beatmaps.id, id));
			if (!row?.chart) continue;
			try {
				await db.update(beatmaps).set({ rateStars: starsAtRates(row.chart) }).where(eq(beatmaps.id, id));
			} catch (e) {
				console.error('[beatmaps] no rate stars for', id, e);
			}
			// let the worker's requests through between maps
			await new Promise(resolve => setImmediate(resolve));
		}
	} catch (e) {
		console.error('[beatmaps] rate stars backfill failed', e);
	} finally {
		await redis.del(LOCK);
	}
};
