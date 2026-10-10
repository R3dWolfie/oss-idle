import type { CharacterDTO } from '@osu-idle/shared/character';
import {
	apiUrl,
	json,
	rpc,
	unwrap,
	withAuth,
} from './client';

/** Public: a single user by id. */
export const getUser = (id: number | string) =>
	unwrap(rpc.v1.users[':id'].$get({ param: { id: String(id) } }));

const uploadImage = async (path: string, file: File) => {
	const form = new FormData();
	form.append('file', file);
	return json<CharacterDTO>(await fetch(apiUrl(path), withAuth({
		method: 'POST', body: form, 
	})));
};

/** Upload a custom profile picture for the signed-in character; returns the
 *  updated character (with its avatarUrl now pointing at the upload). */
export const uploadAvatar = (file: File) => uploadImage('/v1/me/avatar', file);

/** Remove the custom profile picture, reverting to the osu! avatar. */
export const resetAvatar = () => unwrap(rpc.v1.me.avatar.$delete());

/** Upload a profile banner for the signed-in character; returns the updated character. */
export const uploadBanner = (file: File) => uploadImage('/v1/me/banner', file);

/** Remove the profile banner. */
export const removeBanner = () => unwrap(rpc.v1.me.banner.$delete());

/** Rename the signed-in character (same rules as creation); returns the
 *  updated character. The old name joins its permanent name history. */
export const renameCharacter = (name: string) =>
	unwrap(rpc.v1.me.username.$post({ json: { name } }));
