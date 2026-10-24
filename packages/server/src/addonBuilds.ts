import {
	randomBytes,
	timingSafeEqual,
} from 'node:crypto';
import {
	and,
	asc,
	eq,
	lt,
	or,
	sql,
} from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import {
	ADDON_BUILD_STATUS,
	ADDON_KIND,
	ADDON_TAG,
	type AddonBuildResult,
	type AddonBuildStatus,
} from '@oss-idle/shared/addon';
import {
	addonViolations,
	describeViolations,
} from '@oss-idle/shared/addonRules';
import { VERSION } from '@oss-idle/shared/version';
import { db } from './db/client';
import { addons } from './db/schema/addon';
import { env } from './env';

/** A claimed build nobody reported back on: the builder died, hand it out again. */
const STALE_BUILD_MS = 15 * 60_000;

// a build state change is not an edit: browse sorts by updatedAt
const keepUpdatedAt = sql`${addons.updatedAt}`;

export const newHookSecret = () => randomBytes(24).toString('hex');

export const sameSecret = (got: string, want: string) => {
	const a = Buffer.from(got);
	const b = Buffer.from(want);
	return a.length === b.length && timingSafeEqual(a, b);
};

export const requireBuilder = createMiddleware(async (c, next) => {
	const secret = env.ADDON_BUILD_SECRET;
	if (!secret) throw new HTTPException(503, { message: 'No add-on builder' });
	const token = c.req.header('Authorization')?.replace(/^Bearer /, '') ?? '';
	if (!sameSecret(token, secret)) throw new HTTPException(401, { message: 'Not the builder' });
	await next();
});

/** Ask the builder to look at a repo add-on's newest tag. */
export const queueBuild = (id: number) =>
	db.update(addons)
		.set({
			buildStatus: ADDON_BUILD_STATUS.queued, buildAt: new Date(), updatedAt: keepUpdatedAt,
		})
		.where(and(eq(addons.id, id), eq(addons.kind, ADDON_KIND.repo)));

/** The oldest queued build (or a stale claimed one), now claimed. */
export const claimBuild = async () => {
	const [row] = await db.select().from(addons)
		.where(and(
			eq(addons.kind, ADDON_KIND.repo),
			or(
				eq(addons.buildStatus, ADDON_BUILD_STATUS.queued),
				and(
					eq(addons.buildStatus, ADDON_BUILD_STATUS.building),
					lt(addons.buildAt, new Date(Date.now() - STALE_BUILD_MS)),
				),
			),
		))
		.orderBy(asc(addons.buildAt))
		.limit(1);
	if (!row?.repoUrl) return undefined;

	// another worker may claim the same row
	const [res] = await db.update(addons)
		.set({
			buildStatus: ADDON_BUILD_STATUS.building, buildAt: new Date(), updatedAt: keepUpdatedAt,
		})
		.where(and(
			eq(addons.id, row.id),
			eq(addons.buildStatus, row.buildStatus),
			row.buildAt ? eq(addons.buildAt, row.buildAt) : undefined,
		));
	if (!res.affectedRows) return undefined;
	return {
		id: row.id,
		repoUrl: row.repoUrl,
		commit: row.commit ?? undefined,
	};
};

/**
 * Store what the builder made of a claimed build. A new commit becomes the add-on's
 * source, live at once when the add-on is published. Queued again
 * meanwhile (a push during the build) → it stays queued for another look.
 */
export const applyBuild = async (id: number, result: AddonBuildResult) => {
	const [row] = await db.select().from(addons).where(eq(addons.id, id)).limit(1);
	if (row?.kind !== ADDON_KIND.repo) throw new HTTPException(404, { message: 'Add-on not found' });
	const claimed = row.buildStatus === ADDON_BUILD_STATUS.building;
	if (!claimed && row.buildStatus !== ADDON_BUILD_STATUS.queued) {
		throw new HTTPException(409, { message: 'No build claimed' });
	}
	const done = claimed ? ADDON_BUILD_STATUS.idle : ADDON_BUILD_STATUS.queued;
	const failed = claimed ? ADDON_BUILD_STATUS.failed : ADDON_BUILD_STATUS.queued;

	if (result.outcome === 'failed') return endBuild(id, failed, result.log);
	if (result.outcome === 'unchanged' || result.commit === row.commit) return endBuild(id, done);
	const found = addonViolations(result.bundle);
	if (found.length) {
		const why = describeViolations(found);
		return endBuild(id, failed, `${result.log}\nThe built code is refused:\n${why}`);
	}
	await storeBuild(id, result, done);
};

/** A build that leaves the add-on's code as it was. */
const endBuild = async (id: number, buildStatus: AddonBuildStatus, buildLog?: string) => {
	await db.update(addons).set({
		buildStatus, buildLog, updatedAt: keepUpdatedAt,
	}).where(eq(addons.id, id));
};

/** A new build becomes the add-on's code. */
const storeBuild = async (
	id: number,
	result: Extract<AddonBuildResult, { outcome: 'built' }>,
	buildStatus: AddonBuildStatus,
) => {
	await db.update(addons).set({
		source: result.bundle,
		version: ADDON_TAG.exec(result.tag)![1]!,
		gameVersion: result.gameVersion ?? VERSION,
		commit: result.commit,
		tag: result.tag,
		buildLog: result.log,
		buildStatus,
	}).where(eq(addons.id, id));
};
