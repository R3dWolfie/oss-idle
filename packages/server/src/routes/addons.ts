import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import {
	and,
	desc,
	asc,
	eq,
	isNotNull,
	isNull,
	like,
	or,
	sql,
} from 'drizzle-orm';
import { z } from 'zod';
import {
	ADDON_STATUS,
	addonCreateBody,
	addonModerateBody,
	addonUpdateBody,
} from '@oss-idle/shared/addon';
import { db } from '../db/client';
import {
	addons,
	addonDownloads,
	toAddonDTO,
	toLiveAddonDTO,
} from '../db/schema/addon';
import { users } from '../db/schema/user';
import { requireAuth } from '../auth/middleware';
import { requireActive } from '../auth/active';
import { requireAdmin } from '../auth/admin';
import { saveUploadedImage } from '../uploads';

const idParam = z.coerce.number().int().positive();

// Re-throw the ZodError so the app's onError returns the standard shape.
const jsonBody = <T extends z.ZodType>(schema: T) =>
	zValidator('json', schema, result => {
		if (!result.success) throw result.error;
	});

/** Join the author's username onto an add-on row and map to the wire shape. */
const withAuthor = async (row: typeof addons.$inferSelect, toDTO = toAddonDTO) => {
	const [author] = await db
		.select({ username: users.username })
		.from(users)
		.where(eq(users.id, row.authorId))
		.limit(1);
	return toDTO(row, author?.username ?? 'unknown');
};

/** Load an add-on the caller owns, or throw 404/403. */
const ownedBy = async (id: number, userId: number) => {
	const [row] = await db.select().from(addons).where(eq(addons.id, id)).limit(1);
	if (!row) throw new HTTPException(404, { message: 'Add-on not found' });
	if (row.authorId !== userId) throw new HTTPException(403, { message: 'Not your add-on' });
	return row;
};

const csv = (list: string[]) => list.join(',');

// Browse sort column keyed by the `sort` query; defaults to publish date.
const SORT_COLUMNS = {
	updated: addons.updatedAt,
	downloads: addons.downloads,
	created: addons.publishedAt,
} as const;

/**
 * Add-ons (user-published mods). Browsing the catalog is public but only exposes
 * published add-ons; authoring is auth-gated and owner-checked; moderation is
 * admin-only. Chained so the routes land in the exported AppType.
 */
export const addonsRoutes = new Hono()
	// Public: browse the published catalog. q matches name/author; tag filters;
	// sort by created or updated date.
	.get('/', async c => {
		const q = c.req.query('q')?.trim();
		const tag = c.req.query('tag')?.trim().toLowerCase();
		const sort = SORT_COLUMNS[c.req.query('sort') as keyof typeof SORT_COLUMNS]
			?? SORT_COLUMNS.created;
		const dir = c.req.query('dir') === 'asc' ? asc : desc;

		const where = [isNotNull(addons.publishedSource), isNull(users.restrictedAt)];
		if (q) where.push(
			or(
				like(addons.name, `%${q}%`), 
				like(users.username, `%${q}%`), 
				like(addons.tags, `%${q}%`),
			)!);
		if (tag) where.push(like(addons.tags, `%${tag}%`));

		const rows = await db
			.select()
			.from(addons)
			.innerJoin(users, eq(users.id, addons.authorId))
			.where(and(...where))
			.orderBy(dir(sort));
		return c.json(rows.map(r => toLiveAddonDTO(r.addons, r.user.username)));
	})

	// Auth: the caller's own add-ons (any status, with feedback), newest first.
	.get('/me', requireAuth, async c => {
		const rows = await db.select().from(addons)
			.where(eq(addons.authorId, c.get('userId')))
			.orderBy(desc(addons.updatedAt));
		return c.json(await Promise.all(rows.map(r => withAuthor(r))));
	})

	// Auth: create a draft add-on owned by the caller.
	.post('/', requireActive, jsonBody(addonCreateBody), async c => {
		const body = c.req.valid('json');
		const [created] = await db.insert(addons).values({
			name: body.name,
			description: body.description,
			tags: csv(body.tags),
			version: body.version,
			gameVersion: body.gameVersion,
			icon: body.icon,
			source: body.source,
			authorId: c.get('userId'),
		});
		const [row] = await db.select().from(addons).where(eq(addons.id, created.insertId)).limit(1);
		return c.json(await withAuthor(row!), 201);
	})

	// Auth: upload an icon image; returns the public path to store as `icon`.
	.post('/icon', requireActive, async c => {
		const body = await c.req.parseBody();
		return c.json({ url: await saveUploadedImage(body['file']) });
	})

	// Admin: every pending / on-hold / live add-on for the moderation queue.
	.get('/admin', requireAdmin, async c => {
		const rows = await db.select().from(addons)
			.where(or(
				eq(addons.status, ADDON_STATUS.pending),
				eq(addons.status, ADDON_STATUS.onHold),
				isNotNull(addons.publishedSource),
			))
			.orderBy(desc(addons.updatedAt));
		return c.json(await Promise.all(rows.map(r => withAuthor(r))));
	})

	// Admin: moderate - approve (→ published, stamps publishedAt, makes this code
	// the live release), deny, unpublish (takes the live release down). Denying or
	// holding an update leaves the previously approved release live.
	.patch('/admin/:id', requireAdmin, jsonBody(addonModerateBody), async c => {
		const id = idParam.parse(c.req.param('id'));
		const {
			status, feedback, source,
		} = c.req.valid('json');

		const [existing] = await db.select().from(addons).where(eq(addons.id, id)).limit(1);
		if (!existing) throw new HTTPException(404, { message: 'Add-on not found' });
		if (existing.source !== source) {
			throw new HTTPException(409, { message: 'The add-on changed since you opened it: review it again' });
		}

		const approved = status === ADDON_STATUS.published;
		const publishedAt = approved
			? (existing.publishedAt ?? new Date())
			: existing.publishedAt;
		const release = approved
			? {
				publishedSource: existing.source,
				publishedVersion: existing.version,
				publishedGameVersion: existing.gameVersion,
			}
			: status === ADDON_STATUS.unpublished
				? {
					publishedSource: null, publishedVersion: null, publishedGameVersion: null,
				}
				: {};

		// Snapshot the source the admin acted on, so a later re-review can diff
		// against it (what changed since the last validation).
		await db.update(addons).set({
			status, feedback, publishedAt, reviewedSource: existing.source, ...release,
		}).where(eq(addons.id, id));
		const [row] = await db.select().from(addons).where(eq(addons.id, id)).limit(1);
		return c.json(await withAuthor(row!));
	})

	// Auth+owner: edit. Updating an on-hold add-on answers the moderator's
	// feedback, so it re-enters review (pending); changing the source of a
	// published add-on likewise reverts to pending, its approved release staying
	// live meanwhile. Other edits keep the status and go live as they are.
	.patch('/:id', requireActive, jsonBody(addonUpdateBody), async c => {
		const id = idParam.parse(c.req.param('id'));
		const body = c.req.valid('json');
		const existing = await ownedBy(id, c.get('userId'));

		const sourceChanged = body.source !== undefined && body.source !== existing.source;
		const reReview = existing.status === ADDON_STATUS.onHold
			|| (sourceChanged && existing.status === ADDON_STATUS.published);
		const status = reReview ? ADDON_STATUS.pending : existing.status;

		const live = status === ADDON_STATUS.published
			? {
				publishedVersion: body.version, publishedGameVersion: body.gameVersion,
			}
			: {};

		await db.update(addons).set({
			...body,
			tags: body.tags ? csv(body.tags) : undefined,
			status,
			...live,
		}).where(eq(addons.id, id));
		const [row] = await db.select().from(addons).where(eq(addons.id, id)).limit(1);
		return c.json(await withAuthor(row!));
	})

	// Auth+owner: submit a draft / denied add-on for review.
	.post('/:id/submit', requireActive, async c => {
		const id = idParam.parse(c.req.param('id'));
		const existing = await ownedBy(id, c.get('userId'));
		if (existing.status === ADDON_STATUS.pending || existing.status === ADDON_STATUS.published) {
			throw new HTTPException(409, { message: 'Add-on already submitted' });
		}
		await db.update(addons).set({
			status: ADDON_STATUS.pending, feedback: null, 
		}).where(eq(addons.id, id));
		const [row] = await db.select().from(addons).where(eq(addons.id, id)).limit(1);
		return c.json(await withAuthor(row!));
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
			.where(and(eq(addons.id, id), isNotNull(addons.publishedSource)))
			.limit(1);
		if (!pub) throw new HTTPException(404, { message: 'Add-on not found' });

		const [res] = await db.insert(addonDownloads).ignore()
			.values({
				addonId: id, userId: c.get('userId'), 
			});
		if (res.affectedRows > 0) {
			await db.update(addons)
				.set({ downloads: sql`${addons.downloads} + 1` })
				.where(eq(addons.id, id));
		}
		const [row] = await db.select({ downloads: addons.downloads })
			.from(addons).where(eq(addons.id, id)).limit(1);
		return c.json({ downloads: row?.downloads ?? 0 });
	})

	// Public: a single live add-on (its approved release, incl source, for
	// install). Kept last so the static paths above aren't shadowed by this `:id` catch-all.
	.get('/:id', async c => {
		const id = idParam.parse(c.req.param('id'));
		const [row] = await db.select().from(addons)
			.where(and(eq(addons.id, id), isNotNull(addons.publishedSource)))
			.limit(1);
		if (!row) throw new HTTPException(404, { message: 'Add-on not found' });
		return c.json(await withAuthor(row, toLiveAddonDTO));
	});
