import { BeatmapDecoder } from 'osu-parsers';
import type { Beatmap } from 'osu-classes';

/** A minute of taps, chords and holds at 180 BPM over `keys` columns, the same every time:
 *  enough to see every piece of a skin move. */
export const skinTestChart = (keys: number): Beatmap => {
	const beat = 60000 / 180;
	let seed = 7;
	const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
	const x = (c: number) => Math.floor((c + 0.5) * 512 / keys);
	const objects: string[] = [];
	const busyUntil = new Array<number>(keys).fill(0);
	for (let t = 1000; t < 61000; t += beat / 2) {
		const time = Math.round(t);
		const free = (c: number) => busyUntil[c] < time;
		const column = Math.floor(random() * keys);
		if (!free(column)) continue;
		if (random() < 0.2) {
			const end = Math.round(time + beat * (1 + Math.floor(random() * 3)));
			busyUntil[column] = end + 50;
			objects.push(`${x(column)},192,${time},128,0,${end}:0:0:0:0:`);
		} else {
			busyUntil[column] = time;
			objects.push(`${x(column)},192,${time},1,0,0:0:0:0:`);
		}
	}
	return new BeatmapDecoder().decodeFromString(`osu file format v14

[General]
AudioFilename: none.mp3
Mode: 3

[Metadata]
Title:Skin test
Artist:oss!idle
Creator:oss!idle
Version:${keys}K

[Difficulty]
HPDrainRate:8
CircleSize:${keys}
OverallDifficulty:8

[TimingPoints]
0,${beat},4,1,0,60,1,0

[HitObjects]
${objects.join('\n')}
`);
};
