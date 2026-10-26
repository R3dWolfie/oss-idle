import {
	describe,
	expect,
	it,
} from 'vitest';

import {
	applyReaction,
	MAX_REACTION_KINDS,
} from '@oss-idle/shared/community/reactions';
import {
	chatLineDTO,
	clientMessage,
	serverMessage,
} from '@oss-idle/shared/community/wire';

describe('applyReaction', () => {
	it('adds you to an emoji, in order, and takes you off it again', () => {
		const one = applyReaction(undefined, 7, 1, true);
		expect(one).toEqual({ 7: [1] });
		expect(applyReaction(one, 7, 2, true)).toEqual({ 7: [1, 2] });
		expect(applyReaction({ 7: [1, 2] }, 7, 1, false)).toEqual({ 7: [2] });
	});

	it('drops an emoji nobody holds any more', () => {
		expect(applyReaction({
			7: [1], 8: [2], 
		}, 7, 1, false)).toEqual({ 8: [2] });
	});

	it('changes nothing when it is already so', () => {
		expect(applyReaction({ 7: [1] }, 7, 1, true)).toBeUndefined();
		expect(applyReaction({ 7: [1] }, 7, 2, false)).toBeUndefined();
		expect(applyReaction(undefined, 7, 1, false)).toBeUndefined();
	});

	it('takes no new emoji past the limit, but more of one already there', () => {
		const kinds = Array.from({ length: MAX_REACTION_KINDS }, (_, i) => [String(i + 1), [99]]);
		const full = Object.fromEntries(kinds);
		expect(applyReaction(full, 999, 1, true)).toBeUndefined();
		expect(applyReaction(full, 1, 1, true)?.[1]).toEqual([99, 1]);
	});
});

describe('the wire', () => {
	const line = {
		kind: 'player', id: 'a', channel: '#oss!idle', text: 'gg', at: 1,
		from: {
			characterId: 1, userId: 1, name: 'R3D', color: '#fff',
		},
	};

	it('carries a line with or without reactions', () => {
		expect(chatLineDTO.safeParse(line).success).toBe(true);
		expect(chatLineDTO.parse({
			...line, reactions: { 7: [1, 2] }, 
		}).reactions).toEqual({ 7: [1, 2] });
	});

	it('takes a reaction from a client and its result to every client', () => {
		expect(clientMessage.safeParse({
			type: 'chat:react', channel: '#oss!idle', id: 'a', emoji: 7, on: true,
		}).success).toBe(true);
		expect(serverMessage.safeParse({
			type: 'chat:react', channel: '#oss!idle', id: 'a', reactions: { 7: [1] },
		}).success).toBe(true);
	});

	it('refuses a reaction without a proper emoji id', () => {
		expect(clientMessage.safeParse({
			type: 'chat:react', channel: '#oss!idle', id: 'a', emoji: 0, on: true,
		}).success).toBe(false);
	});
});
