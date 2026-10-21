import {
	afterAll,
	describe,
	expect,
	it,
} from 'vitest';
import { request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { closeUnread } from '../../server/src/closeUnread';

const app = new Hono()
	.use('*', closeUnread)
	.post('/early', c => c.json({ error: 'Too many requests' }, 429))
	.post('/read', async c => c.json({ size: (await c.req.text()).length }))
	.get('/', c => c.text('ok'));

const server = serve({
	fetch: app.fetch, port: 0, hostname: '127.0.0.1',
});
afterAll(() => void server.close());

/** The response's Connection header; an upload sends only its first chunk of `size`. */
const connection = (method: string, path: string, size = 0, whole = true) =>
	new Promise<string | undefined>((resolve, reject) => {
		const req = request({
			port: (server.address() as AddressInfo).port, host: '127.0.0.1', method, path,
			headers: size ? {
				'Content-Length': size, Connection: 'keep-alive', 
			} : { Connection: 'keep-alive' },
		}, res => {
			res.resume();
			resolve(res.headers.connection);
			req.destroy();
		});
		req.on('error', reject);
		if (size) req.write(Buffer.alloc(whole ? size : 1024));
		if (whole) req.end();
	});

describe('closeUnread', () => {
	it('closes a connection answered before its body arrived', async () => {
		expect(await connection('POST', '/early', 2_000_000, false)).toBe('close');
	});

	it('keeps connections whose body was read, or had none', async () => {
		expect(await connection('POST', '/read', 1000)).toBe('keep-alive');
		expect(await connection('GET', '/')).toBe('keep-alive');
	});
});
