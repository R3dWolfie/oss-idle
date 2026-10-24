import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import {
	and,
	desc,
	eq,
	like,
} from 'drizzle-orm';
import {
	ADDON_KIND,
	ADDON_STATUS,
	AddonTypes,
	addonBuildResult,
	addonCreateBody,
	addonModerateBody,
	addonUpdateBody,
	type AddonUpdateBody,
} from '@oss-idle/shared/addon';
import {
	addonViolations,
	describeViolations,
} from '@oss-idle/shared/addonRules';
import { db } from '../db/client';
import {
	addons,
	addonDownloads,
	toAddonDTO,
	toLiveAddonDTO,
	type AddonRow,
} from '../db/schema/addon';
import { apiBaseUrl } from '../env';
import {
	applyBuild,
	claimBuild,
	newHookSecret,
	queueBuild,
	requireBuilder,
	sameSecret,
} from '../addonBuilds';
import { users } from '../db/schema/user';
import { requireAuth } from '../auth/middleware';
import { requireActive } from '../auth/active';
import { requireAdmin } from '../auth/admin';
import { saveUploadedImage } from '../uploads';
import {
	idParam,
	valid,
} from '../validate';
import { dailyLimit } from '../rateLimit';
import { csv } from '../db/columns';
import {
	browseQuery,
	countDownload,
	owned,
	withAuthor,
} from '../authored';

// add-ons publish without review: publishes and icon uploads are capped per account, like skins'
const ADDONS_PER_DAY = 5;
const ICONS_PER_DAY = 5;

/** Load an add-on the caller owns, or throw 404/403. */
const ownedBy = async (id: number, userId: number) => {
	const [row] = await db.select().from(addons).where(eq(addons.id, id)).limit(1);
	return owned(row, userId, 'Add-on');
};

/** The author's view: with the repository webhook. */
const toOwnAddonDTO = (row: AddonRow, authorName: string) => ({
	...toAddonDTO(row, authorName),
	hookUrl: row.hookSecret ? `${apiBaseUrl}/v1/addons/${row.id}/hook/${row.hookSecret}` : undefined,
});

/** An author's edit as stored: a repo add-on's source and versions come from its builds only. */
const editsOf = (existing: AddonRow, {
	kind, repoUrl, ...edits
}: AddonUpdateBody) => {
	if ((kind ?? existing.kind) !== ADDON_KIND.repo) return {
		...edits, kind, repoUrl: undefined,
	};
	const url = repoUrl ?? existing.repoUrl;
	if (!url) throw new HTTPException(400, { message: 'A repository add-on needs its repository address' });
	return {
		...edits,
		source: undefined,
		version: undefined,
		gameVersion: undefined,
		kind,
		repoUrl: url,
		hookSecret: existing.hookSecret ?? newHookSecret(),
	};
};

const isPublished = eq(addons.status, ADDON_STATUS.published);

/** Code players may run: nothing that runs code they cannot read in it. */
const assertAllowed = (source: string | undefined) => {
	const found = source === undefined ? [] : addonViolations(source);
	if (found.length) {
		throw new HTTPException(400, { message: `This code is not allowed:\n${describeViolations(found)}` });
	}
};

const reread = async (id: number) => {
	const [row] = await db.select().from(addons).where(eq(addons.id, id)).limit(1);
	return withAuthor(row!, toOwnAddonDTO);
};

/**
 * Add-ons (user-published mods). Browsing the catalog is public but only exposes
 * published add-ons; authoring is auth-gated and owner-checked, and authors answer
 * for what their add-ons do; taking one down is admin-only. Chained so the routes
 * land in the exported AppType.
 */
export const addonsRoutes = new Hono()
	// Public: browse the published catalog. q matches name/author; tag filters;
	// sort by created or updated date.
	.get('/', async c => {
		const type = AddonTypes.find(known => known === c.req.query('type'));
		const { where, orderBy } = browseQuery(c, addons);
		where.push(isPublished);
		if (type) where.push(like(addons.types, `%${type}%`));
		const rows = await db
			.select()
			.from(addons)
			.innerJoin(users, eq(users.id, addons.authorId))
			.where(and(...where))
			.orderBy(orderBy);
		return c.json(rows.map(r => toLiveAddonDTO(r.addons, r.user.username)));
	})

	// Auth: the caller's own add-ons (any status), newest first.
	.get('/me', requireAuth, async c => {
		const rows = await db.select().from(addons)
			.where(eq(addons.authorId, c.get('userId')))
			.orderBy(desc(addons.updatedAt));
		return c.json(await Promise.all(rows.map(r => withAuthor(r, toOwnAddonDTO))));
	})

	// Auth: create a draft add-on owned by the caller. A repo add-on starts on its
	// first build.
	.post('/', requireActive, valid('json', addonCreateBody), async c => {
		const body = c.req.valid('json');
		const repo = body.kind === ADDON_KIND.repo;
		if (!repo) assertAllowed(body.source);
		const [created] = await db.insert(addons).values({
			name: body.name,
			description: body.description,
			tags: csv(body.tags),
			types: csv(body.types),
			version: body.version,
			gameVersion: body.gameVersion,
			icon: body.icon,
			source: body.source,
			authorId: c.get('userId'),
			kind: body.kind,
			repoUrl: repo ? body.repoUrl : null,
			hookSecret: repo ? newHookSecret() : null,
		});
		if (repo) await queueBuild(created.insertId);
		return c.json(await reread(created.insertId), 201);
	})

	// Builder: claim the oldest queued repo build.
	.post('/builds/claim', requireBuilder, async c => c.json({ job: await claimBuild() }))

	// Builder: report on a claimed build.
	.post('/builds/:id', requireBuilder, valid('json', addonBuildResult), async c => {
		await applyBuild(idParam.parse(c.req.param('id')), c.req.valid('json'));
		return c.json({ ok: true });
	})

	// Auth: upload an icon image; returns the public path to store as `icon`.
	.post('/icon', requireActive, dailyLimit('addon-icons', ICONS_PER_DAY), async c => {
		const body = await c.req.parseBody();
		return c.json({ url: await saveUploadedImage(body['file']) });
	})

	// Admin: every published add-on, to take one down.
	.get('/admin', requireAdmin, async c => {
		const rows = await db.select().from(addons).where(isPublished).orderBy(desc(addons.updatedAt));
		return c.json(await Promise.all(rows.map(r => withAuthor(r, toAddonDTO))));
	})

	// Admin: take an add-on down (unpublished), or put it back.
	.patch('/admin/:id', requireAdmin, valid('json', addonModerateBody), async c => {
		const id = idParam.parse(c.req.param('id'));
		const { status } = c.req.valid('json');
		const [existing] = await db.select().from(addons).where(eq(addons.id, id)).limit(1);
		if (!existing) throw new HTTPException(404, { message: 'Add-on not found' });
		await db.update(addons).set({
			status,
			publishedAt: status === ADDON_STATUS.published ? (existing.publishedAt ?? new Date()) : undefined,
		}).where(eq(addons.id, id));
		const [row] = await db.select().from(addons).where(eq(addons.id, id)).limit(1);
		return c.json(await withAuthor(row!, toAddonDTO));
	})

	// Auth+owner: edit. A published add-on's edits are live as saved. A repo
	// add-on's source and versions come from its builds only.
	.patch('/:id', requireActive, valid('json', addonUpdateBody), async c => {
		const id = idParam.parse(c.req.param('id'));
		const existing = await ownedBy(id, c.get('userId'));
		const body = editsOf(existing, c.req.valid('json'));
		if (body.source !== existing.source) assertAllowed(body.source);

		await db.update(addons).set({
			...body,
			tags: body.tags ? csv(body.tags) : undefined,
			types: body.types ? csv(body.types) : undefined,
		}).where(eq(addons.id, id));
		if (body.repoUrl && body.repoUrl !== existing.repoUrl) await queueBuild(id);
		return c.json(await reread(id));
	})

	// Auth+owner: publish a draft to every player. A repo add-on publishes once it
	// has a build.
	.post('/:id/submit', requireActive, dailyLimit('addons', ADDONS_PER_DAY), async c => {
		const id = idParam.parse(c.req.param('id'));
		const existing = await ownedBy(id, c.get('userId'));
		if (existing.status === ADDON_STATUS.published) {
			throw new HTTPException(409, { message: 'Add-on already published' });
		}
		if (existing.kind === ADDON_KIND.repo && !existing.commit) {
			throw new HTTPException(409, { message: 'Wait for the first build before publishing' });
		}
		assertAllowed(existing.source);
		await db.update(addons).set({
			status: ADDON_STATUS.published, publishedAt: existing.publishedAt ?? new Date(),
		}).where(eq(addons.id, id));
		return c.json(await reread(id));
	})

	// Auth+owner: look for a new release tag now.
	.post('/:id/check', requireActive, async c => {
		const id = idParam.parse(c.req.param('id'));
		await ownedBy(id, c.get('userId'));
		await queueBuild(id);
		return c.json(await reread(id));
	})

	// Auth+owner: a new webhook secret; the old webhook stops working.
	.post('/:id/hook-secret', requireActive, async c => {
		const id = idParam.parse(c.req.param('id'));
		await ownedBy(id, c.get('userId'));
		await db.update(addons).set({ hookSecret: newHookSecret() }).where(eq(addons.id, id));
		return c.json(await reread(id));
	})

	// Public: the repository's push webhook, from any git host (the payload is ignored).
	.post('/:id/hook/:secret', async c => {
		const id = idParam.parse(c.req.param('id'));
		const [row] = await db.select({ hookSecret: addons.hookSecret }).from(addons)
			.where(and(eq(addons.id, id), eq(addons.kind, ADDON_KIND.repo)))
			.limit(1);
		if (!row?.hookSecret || !sameSecret(c.req.param('secret'), row.hookSecret)) {
			throw new HTTPException(404, { message: 'Add-on not found' });
		}
		await queueBuild(id);
		return c.json({ ok: true });
	})

	// Auth+owner: delete.
	.delete('/:id', requireAuth, async c => {
		const id = idParam.parse(c.req.param('id'));
		await ownedBy(id, c.get('userId'));
		await db.delete(addons).where(eq(addons.id, id));
		return c.json({ ok: true });
	})

	// Auth: record that the caller installed this add-on. Deduped per player by
	// the unique key, so the counter only moves on a player's first install.
	.post('/:id/download', requireAuth, async c => {
		const id = idParam.parse(c.req.param('id'));
		const [pub] = await db.select({ id: addons.id }).from(addons)
			.where(and(eq(addons.id, id), isPublished))
			.limit(1);
		if (!pub) throw new HTTPException(404, { message: 'Add-on not found' });

		const inserted = await db.insert(addonDownloads).ignore().values({
			addonId: id, userId: c.get('userId'),
		});
		return c.json(await countDownload(addons, id, inserted));
	})

	// Public: a single published add-on (incl source, for install). Kept last so the static paths above aren't shadowed by this `:id` catch-all.
	.get('/:id', async c => {
		const id = idParam.parse(c.req.param('id'));
		const [row] = await db.select().from(addons)
			.where(and(eq(addons.id, id), isPublished))
			.limit(1);
		if (!row) throw new HTTPException(404, { message: 'Add-on not found' });
		return c.json(await withAuthor(row, toLiveAddonDTO));
	});
