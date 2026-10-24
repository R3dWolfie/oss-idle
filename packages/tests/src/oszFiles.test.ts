import {
	describe,
	expect,
	it,
} from 'vitest';
import { unwrapArchive } from '@oss-idle/shared/osuSkin/files';

const file = new Uint8Array([1]);

describe('an imported archive', () => {
	it('comes out of the one folder wrapping it, without macOS copies', () => {
		const files = unwrapArchive({
			'My Set/a.osu': file, 'My Set/audio.mp3': file, 'My Set/sb/bg.png': file,
			'__MACOSX/My Set/._a.osu': file, 'My Set/._audio.mp3': file, 'My Set/': file,
		});
		expect(Object.keys(files).sort()).toEqual(['a.osu', 'audio.mp3', 'sb/bg.png']);
	});

	it('keeps an archive already at its root as it is', () => {
		expect(Object.keys(unwrapArchive({
			'a.osu': file, 'sb/bg.png': file, 
		})).sort()).toEqual(['a.osu', 'sb/bg.png']);
	});
});
