/**
 * Read every character's levels back off the XP it has kept.
 *
 * Run this after any change to the XP curve. The level curve is tuned between
 * releases - most recently the endgame tier past 100, which used to cost a flat
 * 10M per level and now grows by 10M each level - and a stored level is only
 * ever the old prices' answer. The XP itself means the same under any curve.
 *
 * So this reads `${skill}TotalXp` and writes back the level and the progress
 * inside it, one direction, never the other way round: nothing here creates,
 * destroys or moves XP.
 *
 * A total of 0 under a level above it is a row that predates the backfill, not
 * a character with nothing: deriving from it would erase the level. Those are
 * reported and left alone - run `fix:overall` first, which is what puts the
 * totals back in step with the levels.
 *
 *   npm -w @oss-idle/server run relevel:prod -- --dry-run
 */
import { eq } from 'drizzle-orm';
import { xpGivesLevel } from '@oss-idle/shared/sim/skills/xp';
import {
	Skills,
	type SkillName,
} from '@oss-idle/shared/skills';
import { db } from './client';
import { characters } from './schema/character';
import { reindexCharacter } from '../rankings';

const dryRun = process.argv.includes('--dry-run');

const main = async () => {
	const rows = await db.select().from(characters);
	console.log(`checking ${rows.length} characters${dryRun ? ' (dry run)' : ''}`);

	let relevelled = 0;
	let stale = 0;
	for (const row of rows) {
		const untotalled = Skills.filter(s => row[`${s}TotalXp`] === 0 && row[`${s}Level`] > 0);
		if (untotalled.length) {
			console.log(`  ! ${row.name} (${row.id}): no total behind ${untotalled.join(', ')} - skipped`);
			stale++;
			continue;
		}

		const updates = {} as Record<`${SkillName}${'Level' | 'Xp'}`
		| `overall${'Level' | 'Xp'}`, number>;
		const dropped: string[] = [];

		for (const skill of Skills) {
			const next = xpGivesLevel(row[`${skill}TotalXp`]);
			updates[`${skill}Level`] = next.level;
			updates[`${skill}Xp`] = Math.round(next.xp);
			if (next.level !== row[`${skill}Level`]) {
				dropped.push(`${skill} ${row[`${skill}Level`]}->${next.level}`);
			}
		}

		const overall = xpGivesLevel(row.overallTotalXp);
		updates.overallLevel = overall.level;
		updates.overallXp = Math.round(overall.xp);

		if (!dropped.length && overall.level === row.overallLevel) continue;

		console.log(
			`  ${row.name} (${row.id}): Lv${row.overallLevel} -> Lv${overall.level}`
			+ (dropped.length ? `  [${dropped.join(', ')}]` : ''),
		);

		if (!dryRun) {
			await db.update(characters).set(updates).where(eq(characters.id, row.id));
			// the skill boards rank on the level, so they have to be told
			await reindexCharacter(row.id);
		}
		relevelled++;
	}

	const plural = relevelled === 1 ? '' : 's';
	console.log(`\n${relevelled} character${plural} ${dryRun ? 'would be' : ''} relevelled`);
	if (stale) console.log(`${stale} skipped with no totals - run fix:overall, then this again`);
	process.exit(0);
};

void main();
