import { HTTPException } from 'hono/http-exception';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { farmQuery } from '../db/stats';
import { characters } from '../db/schema/character';
import {
	OLD_SUFFIX,
	usesReservedOld,
} from '@oss-idle/shared/rebirth';

/** The name a displaced character falls back to, osu!-style: append _old until
 *  it is free, so a lineage chains Adri -> Adri_old -> Adri_old_old. */
export const displacedName = async (name: string): Promise<string> => {
	let candidate = `${name}${OLD_SUFFIX}`;
	for (;;) {
		const [taken] = await db
			.select({ id: characters.id })
			.from(characters)
			.where(eq(characters.name, candidate))
			.limit(1);
		if (!taken) return candidate;
		candidate = `${candidate}${OLD_SUFFIX}`;
	}
};

/** Reject a name already used by another character (`excludeCharacterId` is the
 *  caller's own, for renames), reserved by another osu! account, or carrying the
 *  _old token, which only a player whose own osu! username has it may use. */
export const assertNameAvailable = async (
	userId: number,
	name: string,
	osuUsername: string,
	excludeCharacterId?: number,
) => {
	if (usesReservedOld(name, osuUsername)) {
		throw new HTTPException(403, { message: 'Name is reserved' });
	}

	const [existingName] = await db
		.select({ id: characters.id })
		.from(characters)
		.where(eq(characters.name, name))
		.limit(1);
	if (existingName && existingName.id !== excludeCharacterId) {
		throw new HTTPException(409, { message: 'Name already taken' });
	}

	// latin1 / utf8mb3 columns: a name outside them (kana, emoji) must not error
	const results1 = await farmQuery(
		'SELECT 1 FROM stats.osu_user WHERE osu_id != ? AND CONVERT(username USING utf8mb4) = ? LIMIT 1',
		[userId, name]);
	const results2 = await farmQuery(
		'SELECT 1 FROM farm.user WHERE osu_id != ? AND CONVERT(username USING utf8mb4) = ? LIMIT 1',
		[userId, name]);

	if (results1.length || results2.length) {
		throw new HTTPException(403, { message: 'Name is reserved' });
	}
};
