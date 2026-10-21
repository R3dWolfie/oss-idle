import {
	createHmac,
	timingSafeEqual,
} from 'node:crypto';
import { lookup } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import {
	isIP,
	type LookupFunction,
} from 'node:net';
import {
	Readable,
	Transform,
} from 'node:stream';
import {
	apiBaseUrl,
	env,
} from './env';
import { isInternal } from './internalAddress';

/** Images and audio from me! pages, fetched by the API (camo-style) so viewers
 *  never connect to the hosts players link. */

const MAX_BYTES = 20 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

const key = createHmac('sha256', env.JWT_SECRET).update('media-proxy').digest();
const sign = (url: string) => createHmac('sha256', key).update(url).digest('base64url');

export const proxiedUrl = (url: string) =>
	`${apiBaseUrl}/v1/proxy/${sign(url)}?url=${encodeURIComponent(url)}`;

export const validSignature = (sig: string, url: string) => {
	const want = Buffer.from(sign(url));
	const got = Buffer.from(sig);
	return got.length === want.length && timingSafeEqual(got, want);
};

// checked at connect time, so a host can't resolve public for a check and private for the fetch
const publicLookup: LookupFunction = (hostname, options, callback) => {
	lookup(hostname, {
		...options, all: true, 
	}, (err, addresses) => {
		if (err) return callback(err, '', 4);
		if (addresses.some(a => isInternal(a.address))) {
			return callback(new Error('Internal address'), '', 4);
		}
		if (options.all) return (callback as (e: null, a: typeof addresses) => void)(null, addresses);
		callback(null, addresses[0].address, addresses[0].family);
	});
};

export type Upstream = {
	status: number;
	headers: Record<string, string>;
	body: ReadableStream;
};

const PASSED = [
	'content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag',
];

const allowedType = (type = '') =>
	(type.startsWith('image/') && !type.startsWith('image/svg')) || type.startsWith('audio/');

/** GET a public http(s) image or audio file, following a few redirects; undefined when refused. */
export const fetchMedia = (
	raw: string,
	range?: string,
	redirects = MAX_REDIRECTS,
): Promise<Upstream | undefined> => {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return Promise.resolve(undefined);
	}
	const host = url.hostname.replace(/^\[|\]$/g, '');
	if (!['http:', 'https:'].includes(url.protocol) || url.port || url.username
		|| (isIP(host) && isInternal(host))) return Promise.resolve(undefined);

	return new Promise(resolve => {
		const req = (url.protocol === 'https:' ? https : http).get(url, {
			lookup: publicLookup,
			timeout: TIMEOUT_MS,
			headers: {
				'user-agent': 'oss!idle media proxy',
				...range && { range },
			},
		}, res => {
			const status = res.statusCode ?? 502;
			const location = res.headers.location;
			if (status >= 300 && status < 400 && location && redirects > 0) {
				res.resume();
				return resolve(fetchMedia(new URL(location, url).href, range, redirects - 1));
			}
			const length = Number(res.headers['content-length'] ?? 0);
			const served = status === 200 || status === 206;
			if (!served || !allowedType(res.headers['content-type']) || length > MAX_BYTES) {
				res.resume();
				return resolve(undefined);
			}
			let seen = 0;
			const capped = new Transform({
				transform(chunk: Buffer, _, done) {
					seen += chunk.length;
					done(seen > MAX_BYTES ? new Error('Too large') : undefined, chunk);
				},
			});
			res.on('error', e => capped.destroy(e));
			resolve({
				status,
				headers: Object.fromEntries(PASSED.flatMap(h => {
					const v = res.headers[h];
					return typeof v === 'string' ? [[h, v]] : [];
				})),
				body: Readable.toWeb(res.pipe(capped)) as ReadableStream,
			});
		});
		req.on('timeout', () => req.destroy());
		req.on('error', () => resolve(undefined));
	});
};
