import {
	describe,
	expect,
	it,
} from 'vitest';
import { unwrapWav } from '../../client/src/audio/wav';

// 50 ms of a 440 Hz sine at 8 kHz stereo, encoded by ffmpeg
const MS_ADPCM =
	'UklGRlICAABXQVZFZm10IDIAAAACAAIAQB8AAIA+AACAAAQAIAB0AAcAAAEAAAACAP8AAAAAwABAAPAAAADMATD/iAEY/2ZhY3QE' +
	'AAAAkAEAAGRhdGEAAgAAAAAQABAA1QPVAwAAAAB3d3dE/93MzN3d3e4AEURVM0QzIiIA7t3Mu93d3e7/EURERDNEMxER/93Mu93d' +
	'3e4AESJVRDNEIiIR/+7MzMzd3e7/ESJEVTNEIiIRAO7MzN3M3e7/ACJEREQzMzMRAO7MzLvd7t3/ACIzVUQzMzMRAP8AAKQApAB+' +
	'BH4Evwe/B6rd3d3//yIzVUREIjMREf/du93M3d3uABEzVUQzMzMzEe7du8zM3e7u/wAzRFUzMzMzEf/uu8zdzN3u/wAzM2YzRCIi' +
	'EQDu3bvM3e7d/wAiREREMzMzIgDuzLvdzN3u/wARM1VEMzMzERHu3ardzN3u7gAA5gDmAJ71nvW29Lb0IkREM0QiIhH/3czMzN3d' +
	'7gAAM1UzVSIzEREA3d2q3d3d7v8RIlUzVSIzIhH//8zMzN3u3f8AIkRVMzMzMyIA3cy73czd7u4AIjNmMzNEIhER7t3Mu93d7u4A' +
	'ETNVRDNEIiIA/93MzMzd7u7/ETNVM1UiAABVAVUBpAqkCrcItwgR/+7dzMzd3e4AADNEVTMzRBERAO7MzN3M3e7/ESIzZjNEIiIR' +
	'AO7du93M3e7uACJEREQAAAAAAAAAAAAAAAAAAAAAAAAA/xH/Ef8R/xH/Ef8R/xH/Ef8R/xH/Ef8R/xH/Ef8R/xH/Ef8R/xH/Ef8R' +
	'/xE=';
const IMA_ADPCM =
	'UklGRjQCAABXQVZFZm10IBQAAAARAAIAQB8AAIA+AACAAAQAAgB5AGZhY3QEAAAAkAEAAGRhdGEAAgAAAAAAAAAAAAB3d3fEd3d3' +
	'xMuqiTHLqokxVCMTkFQjE5DbvLuK27y7ijE2NCMxNjQjkMu9rJDLvayJIDQ1iSA0NSKAyswigMrMq4oQRKuKEEQ0IoG6NCKBur6s' +
	'miC+rJogQzUyAEM1MgDJvLyayby8mhhjQyIYY0MiAbncqwG53Kul9jMApfYzAIkhNTSJITU0E4DbvBOA27ysiSFjrIkhYzMigNoz' +
	'IoDavKyZEbysmRFEMxSBRDMUgbrNq5q6zauaIGNDIiBjQyKBur28gbq9vJoQY0OaEGNDIgG5zSIBuc2rmyhTq5soUzQzAbk0MwG5' +
	'3buaGd27mhlTNDMSUzQzEoUKLwCFCi8Ay72sicu9rIkgNDUiIDQ1IoDKzKuAysyrihBENIoQRDQigbq+IoG6vqyaIEOsmiBDNTIA' +
	'yTUyAMm8vJoYvLyaGGNDIgFjQyIBudyrm7ncq5sYUzQzGFM0MwK5vrwCub68mxlDNZsZQzUkAai8JAGovL2qCEK9qghCif0xAIn9' +
	'MQBEIoC6RCKAus26miDNupogREMjgURDI4G6zcuZus3LmRBSgwAQUoMAiACIAIgAiACIAIgAiACIAAiIAIgIiACIAIiAgACIgICA' +
	'gAAIgIAACAgICAgICAgIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIg=';

const bytes = (b64: string): ArrayBuffer =>
	Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;

const wav = (tag: number, data: number[]): ArrayBuffer => {
	const out = new DataView(new ArrayBuffer(44 + data.length));
	[...'RIFF'].forEach((c, i) => out.setUint8(i, c.charCodeAt(0)));
	[...'WAVEfmt '].forEach((c, i) => out.setUint8(8 + i, c.charCodeAt(0)));
	out.setUint32(16, 16, true);
	out.setUint16(20, tag, true);
	out.setUint16(22, 1, true);
	out.setUint32(24, 44100, true);
	out.setUint16(32, 2, true);
	out.setUint16(34, 16, true);
	[...'data'].forEach((c, i) => out.setUint8(36 + i, c.charCodeAt(0)));
	out.setUint32(40, data.length, true);
	data.forEach((b, i) => out.setUint8(44 + i, b));
	return out.buffer;
};

describe('unwrapWav', () => {
	// ffmpeg's decode of every 37th frame, as int16
	const cases = [
		['MS ADPCM', MS_ADPCM, 464, [0, 499, 1351, 1785, 2137, 2554, 2739, 2864, 2931, 2687, 2350, 18, -8]],
		['IMA ADPCM', IMA_ADPCM, 484, [0, 547, 1313, 1718, 2160, 2599, 2718, 2868, 2853, 2665, 2251, 64, 0, 1]],
	] as const;
	for (const [name, b64, frames, expected] of cases) {
		it(`decodes ${name} like ffmpeg`, () => {
			const pcm = unwrapWav(bytes(b64));
			if (!pcm || pcm instanceof Uint8Array) throw new Error('not decoded');
			expect(pcm.rate).toBe(8000);
			expect(pcm.channels).toHaveLength(2);
			for (const channel of pcm.channels) {
				expect(channel.length).toBe(frames);
				expect(expected.map((_, i) => channel[i * 37] * 32768)).toEqual(expected);
			}
		});
	}

	it('plays empty files as silence', () => {
		for (const empty of [new ArrayBuffer(0), wav(1, [])]) {
			const pcm = unwrapWav(empty);
			if (!pcm || pcm instanceof Uint8Array) throw new Error('not silence');
			expect([...pcm.channels[0]]).toEqual([0]);
		}
	});

	it('unwraps Ogg Vorbis in a WAV', () => {
		const ogg = [0x4f, 0x67, 0x67, 0x53, 1, 2, 3];
		expect([...unwrapWav(wav(0x674f, ogg)) as Uint8Array]).toEqual(ogg);
	});

	it('leaves PCM to the browser', () => {
		expect(unwrapWav(wav(1, [0, 0, 1, 0]))).toBeUndefined();
	});
});
