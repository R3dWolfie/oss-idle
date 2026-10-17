import {
	describe,
	it,
	expect,
} from 'vitest';
import { BeatmapDecoder } from 'osu-parsers';
import { buildBarlines } from '@osu-idle/shared/sim/scroll';

// Red lines at 6e-96ms, as in ISOxo - Chamber [Dimensional Drift] (4965027).
const CHART = `osu file format v14

[General]
Mode: 3

[Difficulty]
CircleSize:4
OverallDifficulty:8

[TimingPoints]
0,500,4,1,0,100,1,0
58409,6E-96,4,1,0,100,1,0
58609,500,4,1,0,100,1,0

[HitObjects]
64,192,1000,1,0,0:0:0:0:
`;

describe('buildBarlines', () => {
	it('steps gimmick red lines by the clamped beat length', () => {
		const lines = buildBarlines(new BeatmapDecoder().decodeFromString(CHART), 60000);
		// 200ms section at 4 * 6ms per measure
		expect(lines.filter(l => l.time >= 58409 && l.time < 58609)).toHaveLength(9);
	});
});
