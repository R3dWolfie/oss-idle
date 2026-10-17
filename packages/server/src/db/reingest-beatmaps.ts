import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { pool } from './client';
import { ingestOsz } from '../beatmaps/ingest';
import { oszPath } from '../beatmaps/storage';

/**
 * Re-reads sets from their own stored .osz, ranked ones included: picks up the
 * difficulties an older ingest skipped (no osu! id), ranked like any other; the
 * set's other difficulties stay as they are.
 *
 *   npm -w @osu-idle/server run reingest:beatmaps[:prod] -- <setId> [<setId>…]
 */
const main = async (): Promise<void> => {
	const ids = process.argv.slice(2).map(Number);
	if (!ids.length || ids.some(id => !Number.isInteger(id))) throw new Error('Pass set ids');
	for (const id of ids) {
		const { setId, difficulties } = await ingestOsz(readFileSync(oszPath(id)), { allowRanked: true });
		console.log(`✓ ${id} → set ${setId}, ${difficulties} difficulties`);
	}
};

main()
	.catch(e => { console.error(e); process.exitCode = 1; })
	.finally(() => pool.end());
