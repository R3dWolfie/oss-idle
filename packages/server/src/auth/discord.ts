import {
	DISCORD_REDIRECT_URI,
	env,
} from '../env';

const API = 'https://discord.com/api/v10';

export const discordAuthorizeUrl = (state: string): string => `https://discord.com/oauth2/authorize?${new URLSearchParams({
	client_id: env.DISCORD_CLIENT_ID,
	redirect_uri: DISCORD_REDIRECT_URI,
	response_type: 'code',
	scope: 'identify',
	prompt: 'none',
	state,
})}`;

/** Trade an authorization code for the id of the Discord account that granted it. */
export const fetchDiscordId = async (code: string): Promise<string> => {
	const token = await fetch(`${API}/oauth2/token`, {
		method: 'POST',
		body: new URLSearchParams({
			client_id: env.DISCORD_CLIENT_ID,
			client_secret: env.DISCORD_CLIENT_SECRET ?? '',
			grant_type: 'authorization_code',
			code,
			redirect_uri: DISCORD_REDIRECT_URI,
		}),
	});
	if (!token.ok) throw new Error(`Discord token exchange failed: ${token.status} ${await token.text()}`);
	const { access_token } = await token.json() as { access_token: string };

	const auth = { Authorization: `Bearer ${access_token}` };
	const me = await fetch(`${API}/users/@me`, { headers: auth });
	if (!me.ok) throw new Error(`Discord /users/@me failed: ${me.status}`);
	return (await me.json() as { id: string }).id;
};
