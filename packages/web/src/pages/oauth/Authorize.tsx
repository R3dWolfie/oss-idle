import { ph } from '@lingui/core/macro';
import './Authorize.css';
import {
	useEffect,
	useState,
} from 'react';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import {
	answerAuthorization,
	getAuthorization,
} from '../../api/oauth';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { loginAndReturn } from '../../auth';
import { SCOPE_TEXT } from './scopes';

type Request = Awaited<ReturnType<typeof getAuthorization>>;

/** osu!'s authorization request: an application asks to act on the player's behalf. */
export default function Authorize({ client_id, redirect_uri, scope, state }: {
	client_id?: number;
	redirect_uri?: string;
	scope?: string;
	state?: string;
}) {
	const { i18n } = useLingui();
	const user = useCurrentUser();
	const [request, setRequest] = useState<Request>();
	const [error, setError] = useState<string>();
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (!user || client_id === undefined) return;
		getAuthorization({
			client_id, redirect_uri, scope,
		}).then(setRequest, (e: Error) => setError(e.message));
	}, [user, client_id, redirect_uri, scope]);

	const answer = async (approve: boolean) => {
		if (client_id === undefined) return;
		setBusy(true);
		try {
			const { redirect } = await answerAuthorization({
				client_id, redirect_uri, scope, state, approve,
			});
			window.location.href = redirect;
		} catch (e) {
			setError((e as Error).message);
			setBusy(false);
		}
	};

	if (client_id === undefined) {
		return <main className='page-contents'><Trans>Invalid authorization request.</Trans></main>;
	}

	if (!user) {
		return <main className='page-contents authorize'>
			<h1><Trans>Authorization Request</Trans></h1>
			<p><Trans>Sign in to continue.</Trans></p>
			<button
				type='button'
				className='authorize__button authorize__button--primary'
				onClick={loginAndReturn}
			>
				<Trans>Sign in with osu!</Trans>
			</button>
		</main>;
	}

	if (error) return <main className='page-contents'>{error}</main>;
	if (!request) return <main className='page-contents'><Trans>Loading…</Trans></main>;

	return <main className='page-contents authorize'>
		<h1><Trans>Authorization Request</Trans></h1>
		<p>
			<Trans><strong>{ph({ app: request.client.name })}</strong> is requesting permission to access your account.</Trans>
		</p>
		{request.owner.name && <p className='authorize__owner'>
			<Trans>owned by {ph({ owner: request.owner.name })}</Trans>
		</p>}
		<p><Trans>This application will be able to:</Trans></p>
		<ul className='authorize__scopes'>
			{request.scopes.map(s => <li key={s}>{i18n._(SCOPE_TEXT[s])}</li>)}
		</ul>
		<div className='authorize__buttons'>
			<button
				type='button'
				className='authorize__button'
				disabled={busy}
				onClick={() => void answer(false)}
			>
				<Trans>Cancel</Trans>
			</button>
			<button
				type='button'
				className='authorize__button authorize__button--primary'
				disabled={busy}
				onClick={() => void answer(true)}
			>
				<Trans>Authorize</Trans>
			</button>
		</div>
	</main>;
}
