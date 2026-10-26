import { InferResponseType } from 'hono/client';

import { unwrap } from '@oss-idle/shared/apiBase';
import type { PresenceEntry } from '@oss-idle/shared/community/presence';
import {
	RULESET_IDS,
	type RulesetId,
} from '@oss-idle/shared/rulesets/ids';
import MemCache from '@oss-idle/shared/storage/memcache';

import { Score } from '../../db/schema/score';
import Entities from '../../entity/entities';
import { selectedRuleset } from '../../rulesets/registry';
import { rpc } from '../client';

const endpoint = rpc.v1.characters;

type CharacterResponse = InferResponseType<typeof endpoint[':id']['$get'], 200>;
type CharacterStatsResponse = InferResponseType<typeof endpoint[':id']['stats']['$get'], 200>;

/** Profiles are per ruleset: each is cached under the character and the ruleset asked for. */
const keyOf = (id: number, ruleset: RulesetId) => `${id}:${ruleset}`;
const ttlOf = (id: number) => 1000 * (id === Entities.character.get().id ? 30 : 3600);

const c1 = MemCache.get<CharacterResponse>('API.getCharacter');
const flush = (cache: Map<string | number, unknown>, id: number) =>
	RULESET_IDS.forEach(r => cache.delete(keyOf(id, r)));

export const flushCharacter = (id: number) => flush(c1, id);
export const getCharacter = async (
	id: number,
	ruleset: RulesetId = selectedRuleset.get(),
): Promise<CharacterResponse> => c1.process(keyOf(id, ruleset), () => unwrap(
	endpoint[':id'].$get({
		param: { id: String(id) }, query: { ruleset },
	})), ttlOf(id));

const card = MemCache.get<PresenceEntry>('API.getCharacterCard');
/** An offline player's chat name card. */
export const getCharacterCard = async (id: number): Promise<PresenceEntry> => card.process(
	id, () => unwrap(endpoint[':id'].card.$get({ param: { id: String(id) } })), 60_000,
);

const c2 = MemCache.get<CharacterStatsResponse>('API.getCharacterStats');
export const flushCharacterStats = (id: number) => flush(c2, id);
export const getCharacterStats = async (
	id: number,
	ruleset: RulesetId = selectedRuleset.get(),
): Promise<CharacterStatsResponse> => c2.process(keyOf(id, ruleset), () => unwrap(
	endpoint[':id']['stats'].$get({
		param: { id: String(id) }, query: { ruleset },
	})), ttlOf(id));

/** Plays of this map that still train the live character's memory: guests
 *  count their own scores, signed-in characters ask the server that keeps them. */
export const getMemoryPlays = async (beatmapId: number): Promise<number> => {
	const character = Entities.character.get();
	if (character.isGuest()) {
		return Score.countPlays(
			character.id, beatmapId, character.progress.memoryResetAt, character.memoryForgets(),
		);
	}
	return (await unwrap(
		rpc.v1.me.memory[':beatmap'].$get({ param: { beatmap: String(beatmapId) } }))).plays;
};

type CharacterMedalsResponse = InferResponseType<typeof endpoint[':id']['medals']['$get'], 200>;

const c3 = MemCache.get<CharacterMedalsResponse>('API.getCharacterMedals');
export const getCharacterMedals = async (
	id: number,
	ruleset: RulesetId = selectedRuleset.get(),
): Promise<CharacterMedalsResponse> => c3.process(keyOf(id, ruleset), () => unwrap(
	endpoint[':id']['medals'].$get({
		param: { id: String(id) }, query: { ruleset },
	})), 1000 * 30);
