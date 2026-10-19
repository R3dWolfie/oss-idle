import { z } from 'zod';
import { GROUPS } from './groups.js';

export const userDTO = z.object({
	id: z.number().int().positive(),
	username: z.string(),
	avatarUrl: z.string().url().nullable(),
	country: z.string(), // ISO 3166-1 alpha-2, e.g. 'FR'
	createdAt: z.string(),
	// the supporter tag is active
	supporter: z.boolean(),
	// can't play or chat, hidden from everyone else
	restricted: z.boolean(),
	// the team groups, admin first
	groups: z.array(z.enum(GROUPS)),
});

export type UserDTO = z.infer<typeof userDTO>;
