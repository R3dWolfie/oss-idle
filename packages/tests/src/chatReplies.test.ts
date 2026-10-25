import {
	describe,
	it,
	expect,
} from 'vitest';
import {
	findQuoted,
	parseReply,
	replyLine,
	replyTo,
	snippetOf,
} from '@oss-idle/client/components/community/chat/replies';

const neomi = {
	id: '1a2b3c4d-0000-4000-8000-000000000001', name: 'NeomiCryo',
	text: 'i got like 30 in the first minutes of the medal and then nothing',
};

describe('replies', () => {
	const sent = replyLine(replyTo(neomi), 'same lol');

	it('sends the quote in front, readable as it is, @Name once', () => {
		expect(sent).toBe(
			'[↩ NeomiCryo: i got like 30 in the first minutes of t… #1a2b3c4d] @NeomiCryo same lol',
		);
		expect(replyLine(replyTo(neomi), '@neomicryo yes')).toMatch(/\] @neomicryo yes$/);
	});

	it('reads it back', () => {
		expect(parseReply(sent)).toEqual({
			name: 'NeomiCryo', snippet: 'i got like 30 in the first minutes of t…',
			id: '1a2b3c4d', body: '@NeomiCryo same lol',
		});
		expect(parseReply('[just] a line')).toBeUndefined();
	});

	it('tastes a line: its own quote dropped, links shortened, no quote-ending marks', () => {
		expect(snippetOf(sent)).toBe('@NeomiCryo same lol');
		expect(snippetOf('look https://x.y/z [ok] #1')).toBe('look link ok 1');
		expect(snippetOf('a'.repeat(60))).toHaveLength(40);
	});

	it('finds the answered line by its id', () => {
		const lines = [{ id: '99999999-0000-4000-8000-000000000000' }, neomi];
		expect(findQuoted(lines, parseReply(sent)!)).toBe(neomi);
		expect(findQuoted(lines.slice(0, 1), parseReply(sent)!)).toBeUndefined();
	});
});
