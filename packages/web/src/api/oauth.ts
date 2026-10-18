import type { InferResponseType } from 'hono/client';
import type {
	AuthorizeBody,
	OAuthClientBody,
	OAuthClientUpdateBody,
} from '@osu-idle/shared/oauth';
import {
	rpc,
	unwrap,
} from './client';

const clients = rpc.v1.oauth.clients;

export type OwnClient = InferResponseType<typeof clients.$get, 200>[number];
export type AuthorizedClient = InferResponseType<typeof rpc.v1.oauth.authorized.$get, 200>[number];
export type AuthorizationRequest = { client_id: number; redirect_uri?: string; scope?: string };

/** The signed-in account's own OAuth applications. */
export const getOwnClients = () => unwrap(clients.$get());

export const createClient = (body: OAuthClientBody) => unwrap(clients.$post({ json: body }));

export const updateClient = (id: number, body: OAuthClientUpdateBody) =>
	unwrap(clients[':id'].$put({
		param: { id: String(id) }, json: body,
	}));

export const resetClientSecret = (id: number) =>
	unwrap(clients[':id'].secret.$post({ param: { id: String(id) } }));

export const deleteClient = (id: number) =>
	unwrap(clients[':id'].$delete({ param: { id: String(id) } }));

/** The applications the signed-in account let in. */
export const getAuthorizedClients = () => unwrap(rpc.v1.oauth.authorized.$get());

export const revokeClient = (clientId: number) =>
	unwrap(rpc.v1.oauth.authorized[':clientId'].$delete({ param: { clientId: String(clientId) } }));

/** What the consent page shows for an authorization request. */
export const getAuthorization = (request: AuthorizationRequest) =>
	unwrap(rpc.v1.oauth.authorize.$get({
		query: {
			...request, client_id: String(request.client_id),
		}, 
	}));

/** Approve or deny; answers where to send the browser. */
export const answerAuthorization = (body: AuthorizeBody) =>
	unwrap(rpc.v1.oauth.authorize.$post({ json: body }));
