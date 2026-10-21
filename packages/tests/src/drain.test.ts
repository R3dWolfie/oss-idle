import {
	afterAll,
	describe,
	expect,
	it,
} from 'vitest';
import {
	Agent,
	get,
} from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { closeOnDrain } from '../../server/src/drain';

let release = () => {};
const app = new Hono()
	.get('/slow', () => new Promise<Response>(resolve => {
		release = () => resolve(new Response('ok'));
	}))
	.get('/', c => c.text('ok'));

const server = serve({
	fetch: app.fetch, port: 0, hostname: '127.0.0.1',
}) as Server;
const drain = closeOnDrain(server);
const agent = new Agent({ keepAlive: true });
afterAll(() => {
	agent.destroy();
	server.close();
});

const connection = (path: string) => new Promise<string | undefined>((resolve, reject) => {
	get({
		port: (server.address() as AddressInfo).port, host: '127.0.0.1', path, agent,
	}, res => {
		res.resume();
		resolve(res.headers.connection);
	}).on('error', reject);
});

describe('closeOnDrain', () => {
	it('keeps connections alive until the drain', async () => {
		expect(await connection('/')).toBe('keep-alive');
	});

	it('closes connections after the responses in flight and any later one', async () => {
		const slow = connection('/slow');
		await new Promise(resolve => setTimeout(resolve, 50));
		drain();
		release();
		expect(await slow).toBe('close');
		expect(await connection('/')).toBe('close');
	});
});
