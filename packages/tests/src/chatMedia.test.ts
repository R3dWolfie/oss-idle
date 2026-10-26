import {
	describe,
	expect,
	it,
} from 'vitest';

import {
	mediaIn,
	mediaOf,
	onlyMedia,
} from '@oss-idle/client/components/community/chat/media';

describe('chat media', () => {
	it('shows GIFs and pictures from the known hosts', () => {
		expect(mediaOf('https://media.tenor.com/abc/cat.gif')?.video).toBe(false);
		expect(mediaOf('https://media.tenor.com/abc/cat.mp4')?.video).toBe(true);
		expect(mediaOf('https://media.giphy.com/media/xyz/giphy.gif')?.src).toBe('https://media.giphy.com/media/xyz/giphy.gif');
	});

	it('plays Imgur\'s .gifv as its .mp4', () => {
		expect(mediaOf('https://i.imgur.com/abc.gifv')).toEqual({
			url: 'https://i.imgur.com/abc.gifv', src: 'https://i.imgur.com/abc.mp4', video: true,
		});
	});

	it('shows nothing from anywhere else, over http, or that is not media', () => {
		expect(mediaOf('https://evil.example/cat.gif')).toBeUndefined();
		expect(mediaOf('https://media.tenor.com.evil.example/cat.gif')).toBeUndefined();
		expect(mediaOf('http://media.tenor.com/abc/cat.gif')).toBeUndefined();
		expect(mediaOf('https://tenor.com/view/cat-12345')).toBeUndefined();
	});

	it('finds two at most in a line, and knows a line that is only one', () => {
		const g = (n: number) => `https://media.tenor.com/${n}/a.gif`;
		expect(mediaIn(`look ${g(1)} and ${g(2)} and ${g(3)}`)).toHaveLength(2);
		expect(onlyMedia(` ${g(1)} `)).toBe(true);
		expect(onlyMedia(`lol ${g(1)}`)).toBe(false);
	});
});
