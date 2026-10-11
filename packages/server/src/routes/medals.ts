import { Hono } from 'hono';
import { gt } from 'drizzle-orm';
import { MEDALS } from '@osu-idle/shared/achievements/catalogue';
import { requireAdmin } from '../auth/admin';
import { db } from '../db/client';
import { character_totals } from '../db/schema/character_totals';
import { getCharacterById } from '../db/schema/character';
import {
	earnedMedals,
	medalHolders,
	medalRules,
} from '../medals';

/** Who qualifies takes a few hundred queries: cache it for the admin page. */
const QUALIFY_TTL_MS = 10 * 60 * 1000;
let qualifying: { at: number, players: number, counts: Map<string, number> } | undefined;

const countQualifying = async () => {
	if (qualifying && Date.now() - qualifying.at < QUALIFY_TTL_MS) return qualifying;
	const active = await db.select({ id: character_totals.id })
		.from(character_totals)
		.where(gt(character_totals.playCount, 0));
	const counts = new Map<string, number>();
	for (const { id } of active) {
		const character = await getCharacterById(id);
		if (!character) continue;
		for (const medal of await earnedMedals(character)) counts.set(medal, (counts.get(medal) ?? 0) + 1);
	}
	qualifying = {
		at: Date.now(), players: active.length, counts,
	};
	return qualifying;
};

export const medalsRoutes = new Hono()
	// Every medal with its rule, how many characters hold it, and how many
	// already qualify (those get it on their next shown result).
	.get('/admin', requireAdmin, async c => {
		const [{ held }, { at, players, counts }] = await Promise.all([
			medalHolders(),
			countQualifying(),
		]);
		const rules = medalRules();
		return c.json({
			players,
			computedAt: at,
			medals: MEDALS.map(m => ({
				id: m.id,
				rule: rules[m.id],
				held: held[m.id] ?? 0,
				qualifying: counts.get(m.id) ?? 0,
			})),
		});
	});
