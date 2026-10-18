/**
 * Builds the web header's playfields (packages/web/public/playfields.json): a few
 * iconic ranked maps, each played from its preview point.
 *
 * Every map gets its scroll position sampled at 60fps (frames) and its notes as
 * scroll positions, both from the game's own ScrollModel, so SVs and BPM changes
 * move the notes exactly as they do in game. The header only has to look up the
 * frame and draw.
 *
 *   npm run playfields
 */
import { writeFileSync } from 'node:fs';
import AdmZip from 'adm-zip';
import '@osu-idle/shared/osu/controlPointPatch';
import { BeatmapDecoder } from 'osu-parsers';
import { ManiaRuleset } from 'osu-mania-stable';
import { ScrollModel } from '@osu-idle/shared/sim/scroll';

const MAPS: [set: number, version: string][] = [
	[551469, 'CHALLENGE'],
	[793200, 'Everybody Dance!'],
	[948786, 'Stage 1: Estimate'],
	[81109, '4K MX'],
	[622946, 'MX'],
];

const FPS = 60;
// playback rate, and how much of the map plays from its preview point
const SPEED = 0.5;
const LENGTH_MS = 16_000;
// scroll distance on screen, in 1x ms; the header's own scale
const VISIBLE = 450;

const beatmaps = new URL('../packages/server/beatmaps/', import.meta.url);
const out = new URL('../packages/web/public/playfields.json', import.meta.url);
const round = (n: number) => Math.round(n * 10) / 10;

const build = ([set, version]: typeof MAPS[number]) => {
	const raw = new AdmZip(new URL(`${set}.osz`, beatmaps).pathname).getEntries()
		.filter(e => e.entryName.endsWith('.osu'))
		.map(e => new BeatmapDecoder().decodeFromString(e.getData().toString('utf8')))
		.find(b => b.metadata.version === version);
	if (!raw) throw new Error(`${set} has no [${version}]`);
	const beatmap = new ManiaRuleset().applyToBeatmap(raw);
	const scroll = new ScrollModel(beatmap);

	const preview = raw.general.previewTime;
	const start = preview > 0 ? preview : raw.totalLength * 0.4;
	const origin = scroll.positionAt(start);
	const frames = Array.from(
		{ length: Math.round(LENGTH_MS / SPEED * FPS / 1000) },
		(_, i) => round(scroll.positionAt(start + i * SPEED * 1000 / FPS) - origin),
	);
	const last = frames[frames.length - 1] + VISIBLE;

	const notes = beatmap.hitObjects.flatMap(o => {
		if (!('column' in o)) return [];
		const head = scroll.positionAt(o.startTime) - origin;
		const tail = 'endTime' in o ? scroll.positionAt(o.endTime as number) - origin : head;
		return tail >= 0 && head <= last ? [o.column as number, round(head), round(tail)] : [];
	});

	const title = `${raw.metadata.artist} - ${raw.metadata.title} [${version}]`;
	console.log(`${title}: ${notes.length / 3} notes`);
	return {
		title,
		keys: beatmap.totalColumns,
		frames,
		notes,
	};
};

writeFileSync(out, JSON.stringify({
	fps: FPS, visible: VISIBLE, maps: MAPS.map(build), 
}));
