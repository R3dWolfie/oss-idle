import { ph } from '@lingui/core/macro';
import { useState } from 'react';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import {
	deleteClient,
	updateClient,
	type OwnClient,
} from '../../api/oauth';
import OAuthDialog from './OAuthDialog';
import OAuthClientSecret from './OAuthClientSecret';
import {
	callbackUrls,
	useAction,
} from './useAction';

/** osu!web's application dialog for one of yours: its credentials, its callback URLs, delete. */
export default function OAuthClientDialog({ client, onSaved, onDeleted, onClose }: {
	client: OwnClient;
	onSaved: (client: OwnClient) => void;
	onDeleted: (id: number) => void;
	onClose: () => void;
}) {
	const { t } = useLingui();
	const [redirect, setRedirect] = useState(client.redirect.join('\n'));
	const { busy, error, run } = useAction();

	const update = () => run(async () => {
		onSaved(await updateClient(client.id, { redirect: callbackUrls(redirect) }));
	});

	const remove = () => run(async () => {
		if (!confirm(t`Delete ${ph({ app: client.name })}? This cannot be undone.`)) return;
		await deleteClient(client.id);
		onDeleted(client.id);
	});

	return <OAuthDialog title={client.name} error={error} onClose={onClose}>
		<OAuthClientSecret client={client} onReset={onSaved} />
		<label className='oauth-dialog__label'><Trans>Application Callback URLs</Trans></label>
		<textarea value={redirect} onChange={e => setRedirect(e.target.value)} />
		<div className='settings__hint'><Trans>One URL per line.</Trans></div>
		<div className='oauth-dialog__buttons'>
			<button
				type='button'
				className='oauth__button oauth__button--danger'
				disabled={busy}
				onClick={() => void remove()}
			>
				<Trans>Delete</Trans>
			</button>
			<button type='button' className='oauth__button' onClick={onClose}><Trans>Cancel</Trans></button>
			<button
				type='button'
				className='oauth__button oauth__button--primary'
				disabled={busy || !redirect.trim()}
				onClick={() => void update()}
			>
				<Trans>Update</Trans>
			</button>
		</div>
	</OAuthDialog>;
}
