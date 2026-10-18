import Synced from '@osu-idle/shared/helpers/synced';
import useSynced from '@osu-idle/shared/hooks/useSynced';
import { versionLabel } from '@osu-idle/shared/rate';
import { rpc } from '../online/client';
import { selectedRate } from './playRate';
import type LightBeatmap from '../osu/beatmap/LightBeatmap';

/** Every difficulty's stars at the picked rate, by id; empty at x1. */
export const rateStars = new Synced<ReadonlyMap<number, number>>(new Map());

const fetched = new Map<number, ReadonlyMap<number, number>>();

const load = async (rate: number): Promise<ReadonlyMap<number, number>> => {
	const known = fetched.get(rate);
	if (known) return known;
	const res = await rpc.v1.beatmap.stars[':rate'].$get({ param: { rate: String(rate) } });
	if (!res.ok) return new Map();
	const stars = new Map(Object.entries(await res.json()).map(([id, s]) => [Number(id), s]));
	fetched.set(rate, stars);
	return stars;
};

void selectedRate.sync(async rate => {
	const stars = rate === 1 ? new Map<number, number>() : await load(rate).catch(() => new Map());
	if (selectedRate.get() === rate) void rateStars.set(stars);
});

/** A difficulty's stars at the picked rate: its own ones at x1, or when the server
 *  doesn't know it (a map that isn't ranked here). */
export const starsOf = (beatmap: LightBeatmap): number =>
	rateStars.get().get(beatmap.metadata.id) ?? beatmap.metadata.difficulty;

/** A difficulty's stars at the picked rate, re-rendering when it changes. */
export const useStarsOf = (beatmap: LightBeatmap): number => {
	useSynced(rateStars);
	return starsOf(beatmap);
};

/** A difficulty's name as shown at the picked rate: Beginner x1.3. */
export const useRatedVersion = (version: string): string => {
	const [rate] = useSynced(selectedRate);
	return versionLabel(version, rate ?? 1);
};
