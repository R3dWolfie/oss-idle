import { z } from 'zod';
import { VERSION } from './version.js';
import { ADDON_DOCS_URL } from './links.js';
import {
	mapped,
	type ValueIn,
} from './helpers/mapped.js';

/**
 * An add-on is born `unpublished` (a private draft owned by its author); its author
 * publishes it (publicly browsable, its edits live as saved), and only an admin
 * takes it down. Their human labels live in `display/addon` so the keys never carry presentation.
 */
export const AddonStatuses = ['unpublished', 'published'] as const;
export const ADDON_STATUS = mapped(AddonStatuses);
export type AddonStatus = ValueIn<typeof ADDON_STATUS>;

/**
 * `inline`: one source edited in game. `repo`: built by us from the newest
 * version tag of a public git repository.
 */
export const AddonKinds = ['inline', 'repo'] as const;
export const ADDON_KIND = mapped(AddonKinds);
export type AddonKind = ValueIn<typeof ADDON_KIND>;

/** What an add-on is for: in play (the default), or in the editor (it gets the editor's
 *  API). An add-on has one or both. */
export const AddonTypes = ['gameplay', 'editor'] as const;
export const ADDON_TYPE = mapped(AddonTypes);
export type AddonType = ValueIn<typeof ADDON_TYPE>;

/** The types an add-on's csv column holds, unknown ones dropped. */
export const parseAddonTypes = (csv: string): AddonType[] => {
	const known = csv.split(',').filter((type): type is AddonType =>
		(AddonTypes as readonly string[]).includes(type));
	return known.length ? known : [ADDON_TYPE.gameplay];
};

/** A repo add-on's build: `queued` by its webhook, `building` once the builder claims it. */
export const AddonBuildStatuses = ['idle', 'queued', 'building', 'failed'] as const;
export const ADDON_BUILD_STATUS = mapped(AddonBuildStatuses);
export type AddonBuildStatus = ValueIn<typeof ADDON_BUILD_STATUS>;

/** Semantic version `MAJOR.MINOR.PATCH`, the author-managed add-on or skin version. */
export const semver = z.string().trim().regex(/^\d+\.\d+\.\d+$/, 'Version must look like 1.2.3');

/** A version tag: `1.2.3` or `v1.2.3`. */
export const ADDON_TAG = /^v?(\d+\.\d+\.\d+)$/;

/** A commit's page on its git host (GitHub, GitLab, Codeberg/Forgejo all take `/commit/<sha>`). */
export const repoCommitUrl = (repoUrl: string, commit: string) =>
	`${repoUrl.replace(/\/$/, '').replace(/\.git$/, '')}/commit/${commit}`;

/** Players download a bundle whole. */
export const MAX_ADDON_BUNDLE = 8 * 1024 * 1024;

const MAX_BUILD_LOG = 256 * 1024;

const repoUrl = z.url({
	protocol: /^https$/,
	error: 'Use the https address of a public git repository',
}).max(512).refine(url => {
	const u = new URL(url);
	return !u.username && !u.password;
}, 'Leave credentials out of the address');

/** Free-form tags: lowercase, hyphen/alnum, deduped, capped. */
export const tags = z.array(
	z.string()
		.trim()
		.toLowerCase()
		.regex(/^[a-z0-9][a-z0-9-]*$/, 'Tags use lowercase letters, numbers and hyphens')
		.max(24),
).max(8).transform(list => [...new Set(list)]);

/**
 * The starter source seeded into the editor when creating a new add-on. The
 * runtime imports an add-on as an ES module and drives it through these two
 * exports (add-ons run unsandboxed against the page). `mount` runs when the
 * add-on is enabled and receives its metadata and the game's host (its React,
 * the editor), `unmount` when it is disabled, updated, or removed.
 */
export const ADDON_TEMPLATE = `// oss!idle add-on: how they work, ${ADDON_DOCS_URL}
export const mount = ({ id, name, version, gameVersion, authorId, authorName }, host) => {
	// runs when the add-on is enabled
	// host.react is the game's React; host.editor.watch(editor => ...) reaches the editor
};

export const unmount = () => {
	// runs when the add-on is disabled / updated / removed
};
`;

const types = z.array(z.enum(AddonTypes)).min(1, 'Pick at least one type')
	.transform(list => [...new Set(list)]);

const addonFields = z.object({
	name: z.string().trim().min(1).max(80),
	description: z.string().trim().max(500).default(''),
	tags: tags.default([]),
	types: types.default([ADDON_TYPE.gameplay]),
	version: semver.default('0.1.0'),
	gameVersion: z.string().trim().max(20).default(VERSION),
	icon: z.string().max(512).nullable().default(null),
	source: z.string().min(1).default(ADDON_TEMPLATE),
});

/** Create payload. `version`/`gameVersion` default sensibly; `source` seeds the template. */
export const addonCreateBody = addonFields.extend({
	kind: z.enum(AddonKinds).default(ADDON_KIND.inline),
	repoUrl: repoUrl.optional(),
}).refine(body => body.kind !== ADDON_KIND.repo || body.repoUrl, {
	message: 'A repository add-on needs its repository address',
	path: ['repoUrl'],
});
export type AddonCreateBody = z.infer<typeof addonCreateBody>;

/** Edit payload (author): any subset of the editable fields. */
export const addonUpdateBody = addonFields.partial().extend({
	kind: z.enum(AddonKinds).optional(),
	repoUrl: repoUrl.optional(),
});
export type AddonUpdateBody = z.infer<typeof addonUpdateBody>;

/** Moderation payload (admin): set the status. */
export const addonModerateBody = z.object({ status: z.enum(AddonStatuses) });

/** What the builder reports for the repo add-on it claimed. */
export const addonBuildResult = z.discriminatedUnion('outcome', [
	z.object({
		outcome: z.literal('built'),
		tag: z.string().regex(ADDON_TAG),
		commit: z.string().regex(/^[0-9a-f]{40}$/),
		gameVersion: z.string().trim().max(20).optional(),
		bundle: z.string().min(1).max(MAX_ADDON_BUNDLE),
		log: z.string().max(MAX_BUILD_LOG),
	}),
	// the newest tag is the commit already built
	z.object({ outcome: z.literal('unchanged') }),
	z.object({
		outcome: z.literal('failed'),
		log: z.string().max(MAX_BUILD_LOG),
	}),
]);
export type AddonBuildResult = z.infer<typeof addonBuildResult>;
