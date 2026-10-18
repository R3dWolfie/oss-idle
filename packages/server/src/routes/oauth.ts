import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
	and,
	desc,
	eq,
} from 'drizzle-orm';
import {
	authorizeBody,
	oauthClientBody,
	oauthClientUpdateBody,
	parseScopes,
	type Scope,
} from '@osu-idle/shared/oauth';
import { db } from '../db/client';
import {
	oauthClients,
	oauthTokens,
} from '../db/schema/oauth';
import { characters } from '../db/schema/character';
import { users } from '../db/schema/user';
import { requireAuth } from '../auth/middleware';
import { requireActive } from '../auth/active';
import { dailyLimit } from '../rateLimit';
import {
	createCode,
	randomSecret,
	redirectsOf,
} from '../oauth';

const idParam = z.coerce.number().int().positive();

/** A client with who owns it, under the name players know them by. */
const clientWithOwner = async (id: number) => {
	const [row] = await db
		.select({
			client: oauthClients,
			owner: {
				id: users.id, name: characters.name,
			},
		})
		.from(oauthClients)
		.innerJoin(users, eq(users.id, oauthClients.userId))
		.leftJoin(characters, eq(characters.id, users.currentCharacter))
		.where(eq(oauthClients.id, id))
		.limit(1);
	return row;
};

const ownClient = async (userId: number, id: number) => {
	const [row] = await db
		.select()
		.from(oauthClients)
		.where(and(eq(oauthClients.id, id), eq(oauthClients.userId, userId)))
		.limit(1);
	if (!row) throw new HTTPException(404, { message: 'Application not found' });
	return row;
};

const toClient = (row: typeof oauthClients.$inferSelect) => ({
	id: row.id,
	name: row.name,
	secret: row.secret,
	redirect: redirectsOf(row),
	createdAt: row.createdAt.getTime(),
});

/** An authorization request checked against the client: what the consent page shows and grants. */
type AuthorizationRequest = { client_id: number; redirect_uri?: string; scope?: string };

const checkRequest = async (query: AuthorizationRequest) => {
	const found = await clientWithOwner(query.client_id);
	if (!found) throw new HTTPException(400, { message: 'Unknown application' });
	const redirects = redirectsOf(found.client);
	const redirectUri = query.redirect_uri ?? redirects[0];
	if (!redirects.includes(redirectUri)) {
		throw new HTTPException(400, { message: 'The redirect_uri is not one of the application\'s callback URLs' });
	}
	const asked = parseScopes(query.scope);
	if (!asked) throw new HTTPException(400, { message: 'Unknown scope' });
	const scopes: Scope[] = [...new Set<Scope>(['identify', ...asked])];
	return {
		...found, redirectUri, scopes,
	};
};

const requestQuery = zValidator('query', z.object({
	client_id: z.coerce.number().int().positive(),
	redirect_uri: z.string().optional(),
	scope: z.string().optional(),
}), r => {
	if (!r.success) throw new HTTPException(400, { message: 'Invalid authorization request' });
});

const json = <T extends z.ZodType>(schema: T) => zValidator('json', schema, r => {
	if (!r.success) throw r.error;
});

const clientBody = json(oauthClientBody);

type Authorized = {
	id: number;
	name: string;
	owner: { id: number; name?: string };
	scopes: Scope[];
};

export const oauthRoutes = new Hono()
	.get('/clients', requireAuth, async c => c.json((await db
		.select()
		.from(oauthClients)
		.where(eq(oauthClients.userId, c.get('userId')))
		.orderBy(oauthClients.id)).map(toClient)))

	.post('/clients', requireActive, dailyLimit('oauth-client', 10), clientBody, async c => {
		const { name, redirect } = c.req.valid('json');
		const [{ id }] = await db.insert(oauthClients).values({
			userId: c.get('userId'), name, secret: randomSecret(), redirect: redirect.join('\n'),
		}).$returningId();
		return c.json(toClient(await ownClient(c.get('userId'), id)));
	})

	.put('/clients/:id', requireActive, json(oauthClientUpdateBody), async c => {
		const client = await ownClient(c.get('userId'), idParam.parse(c.req.param('id')));
		const { redirect } = c.req.valid('json');
		await db.update(oauthClients)
			.set({ redirect: redirect.join('\n') })
			.where(eq(oauthClients.id, client.id));
		return c.json(toClient(await ownClient(c.get('userId'), client.id)));
	})

	.post('/clients/:id/secret', requireActive, async c => {
		const client = await ownClient(c.get('userId'), idParam.parse(c.req.param('id')));
		// like osu!, a new secret disables every token the old one got
		await db.transaction(async tx => {
			await tx.update(oauthClients).set({ secret: randomSecret() }).where(eq(oauthClients.id, client.id));
			await tx.delete(oauthTokens).where(eq(oauthTokens.clientId, client.id));
		});
		return c.json(toClient(await ownClient(c.get('userId'), client.id)));
	})

	.delete('/clients/:id', requireAuth, async c => {
		const client = await ownClient(c.get('userId'), idParam.parse(c.req.param('id')));
		await db.delete(oauthClients).where(eq(oauthClients.id, client.id));
		return c.json({ ok: true });
	})

	// the consent page
	.get('/authorize', requireActive, requestQuery, async c => {
		const { client, owner, scopes } = await checkRequest(c.req.valid('query'));
		return c.json({
			client: {
				id: client.id, name: client.name,
			},
			owner: {
				id: owner.id, name: owner.name ?? undefined,
			},
			scopes,
		});
	})

	.post('/authorize', requireActive, json(authorizeBody), async c => {
		const body = c.req.valid('json');
		const { client, redirectUri, scopes } = await checkRequest(body);
		const url = new URL(redirectUri);
		if (body.approve) {
			url.searchParams.set('code', await createCode({
				clientId: client.id, userId: c.get('userId'), scopes, redirectUri,
			}));
		} else {
			url.searchParams.set('error', 'access_denied');
		}
		if (body.state !== undefined) url.searchParams.set('state', body.state);
		return c.json({ redirect: url.toString() });
	})

	// the applications this account let in, with everything it allowed them
	.get('/authorized', requireAuth, async c => {
		const rows = await db
			.select({
				clientId: oauthClients.id,
				name: oauthClients.name,
				ownerId: users.id,
				ownerName: characters.name,
				scopes: oauthTokens.scopes,
			})
			.from(oauthTokens)
			.innerJoin(oauthClients, eq(oauthClients.id, oauthTokens.clientId))
			.innerJoin(users, eq(users.id, oauthClients.userId))
			.leftJoin(characters, eq(characters.id, users.currentCharacter))
			.where(eq(oauthTokens.userId, c.get('userId')))
			.orderBy(desc(oauthTokens.createdAt));
		const byClient = new Map<number, Authorized>();
		for (const row of rows) {
			const entry = byClient.get(row.clientId) ?? {
				id: row.clientId,
				name: row.name,
				owner: {
					id: row.ownerId, name: row.ownerName ?? undefined,
				},
				scopes: [],
			};
			entry.scopes = [...new Set([...entry.scopes, ...parseScopes(row.scopes) ?? []])];
			byClient.set(row.clientId, entry);
		}
		return c.json([...byClient.values()]);
	})

	.delete('/authorized/:clientId', requireAuth, async c => {
		await db.delete(oauthTokens).where(and(
			eq(oauthTokens.userId, c.get('userId')),
			eq(oauthTokens.clientId, idParam.parse(c.req.param('clientId'))),
		));
		return c.json({ ok: true });
	});
