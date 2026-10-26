import {
	describe,
	expect,
	it,
} from 'vitest';

import {
	chatLineDTO,
	clientMessage,
	MAX_CHAT_LENGTH,
} from '@oss-idle/shared/community/wire';

import { replyBody } from '@oss-idle/client/components/community/chat/replies';

const line = {
	kind: 'player', id: 'b', channel: '#oss!idle', text: '@NeomiCryo same lol', at: 1,
	from: {
		characterId: 2, userId: 2, name: 'Rai', color: '#fff',
	},
	replyTo: {
		id: 'a', userId: 1, name: 'NeomiCryo', color: '#feefb0', text: 'i got like 30',
	},
};

describe('replies', () => {
	it('puts @Name in front once, and drops it rather than go past the limit', () => {
		expect(replyBody('NeomiCryo', 'same lol')).toBe('@NeomiCryo same lol');
		expect(replyBody('NeomiCryo', '@neomicryo yes')).toBe('@neomicryo yes');
		const long = 'a'.repeat(MAX_CHAT_LENGTH - 3);
		expect(replyBody('NeomiCryo', long)).toBe(long);
	});

	it('travels as a field, sent as the answered id', () => {
		expect(chatLineDTO.parse(line)).toEqual(line);
		const plain = {
			...line, replyTo: undefined,
		};
		expect(chatLineDTO.parse(plain).kind).toBe('player');
		expect(clientMessage.parse({
			type: 'chat', channel: '#oss!idle', text: 'hi', replyTo: 'a',
		})).toMatchObject({ replyTo: 'a' });
	});
});
