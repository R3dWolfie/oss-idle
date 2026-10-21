import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import {
	fetchMedia,
	validSignature,
} from '../mediaProxy';
import { rateLimit } from '../rateLimit';

export const proxyRoutes = new Hono()
	.use('*', rateLimit('proxy', 600))
	// A me! page's image or audio file, by the signed URL the BBCode renderer wrote.
	.get('/:sig', async c => {
		const url = c.req.query('url');
		if (!url || !validSignature(c.req.param('sig'), url)) throw new HTTPException(403, { message: 'Bad signature' });
		const media = await fetchMedia(url, c.req.header('range'));
		if (!media) throw new HTTPException(404, { message: 'Not available' });
		return new Response(media.body, {
			status: media.status,
			headers: {
				...media.headers,
				'cache-control': 'public, max-age=86400',
				'content-security-policy': 'default-src \'none\'; sandbox',
			},
		});
	});
