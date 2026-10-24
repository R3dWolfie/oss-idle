import { z } from 'zod';
import {
	mapped,
	type ValueIn,
} from './helpers/mapped.js';
import {
	semver,
	tags,
} from './addon.js';

export const SkinStatuses = [
	'UNPUBLISHED',
	'PUBLISHED',
] as const;
export const SKIN_STATUS = mapped(SkinStatuses);
export type SkinStatus = ValueIn<typeof SKIN_STATUS>;

export const skinCreateBody = z.object({
	name: z.string().trim().min(1).max(80),
	description: z.string().trim().max(500).default(''),
	tags: tags.default([]),
	version: semver.default('0.1.0'),
	icon: z.string().max(512).nullable(),
});
export type SkinCreateBody = z.infer<typeof skinCreateBody>;

export const skinUpdateBody = skinCreateBody.partial();
export type SkinUpdateBody = z.infer<typeof skinUpdateBody>;

export const skinModerateBody = z.object({ status: z.enum(SkinStatuses) });
export type SkinModerateBody = z.infer<typeof skinModerateBody>;
/** One file of a skin, as the skin names it. A catalog skin's carry the server's hash. */
export type SkinFile = { path: string, size: number, hash?: string };

const MB = 1024 * 1024;

/** What a skin's .osk may weigh, packed (the upload) and unpacked, and how many files. */
export const SKIN_UPLOAD_MAX = 100 * MB;
export const SKIN_UNPACKED_MAX = 250 * MB;
export const SKIN_FILES_MAX = 10_000;
