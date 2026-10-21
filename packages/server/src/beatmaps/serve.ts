import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { HTTPException } from 'hono/http-exception';
import { env } from '../env';
import { throttled } from './throttle';
import {
	oszPath,
	previewPath,
} from './storage';

const PREVIEW_MIME: Record<string, string> = {
	mp3: 'audio/mpeg',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
};

const IMMUTABLE = 'public, max-age=31536000, immutable';

/** A preview's file name: its set's id first, no path. */
export const checkPreviewName = (setId: number, file: string) => {
	if (file.includes('/') || file.includes('..') || !file.startsWith(String(setId))) {
		throw new HTTPException(400, { message: 'Bad preview path' });
	}
};

/** A set's .osz. `bulk` (one of a whole-library download) goes out rate-capped. */
export const oszResponse = async (setId: number, bulk: boolean) => {
	const path = oszPath(setId);
	if (!existsSync(path)) throw new HTTPException(404, { message: 'Beatmap file missing' });
	const buf = await readFile(path);
	return new Response(bulk ? throttled(buf, env.BULK_DOWNLOAD_RATE) : buf, {
		headers: {
			'Content-Type': 'application/octet-stream',
			'Content-Length': String(buf.length),
			'Content-Disposition': `attachment; filename="${setId}.osz"`,
			'Cache-Control': IMMUTABLE,
		},
	});
};

/** A set's preview audio or background. */
export const previewResponse = async (file: string) => {
	const path = previewPath(file);
	if (!existsSync(path)) throw new HTTPException(404, { message: 'Preview missing' });
	const buf = await readFile(path);
	return new Response(buf, {
		headers: {
			'Content-Type': PREVIEW_MIME[file.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream',
			'Content-Length': String(buf.length),
			'Cache-Control': IMMUTABLE,
		},
	});
};
