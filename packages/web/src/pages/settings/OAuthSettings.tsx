import './OAuth.css';
import {
	useEffect,
	useState,
} from 'react';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import {
	getAuthorizedClients,
	getOwnClients,
	revokeClient,
	type AuthorizedClient,
	type OwnClient,
} from '../../api/oauth';
import { SCOPE_TEXT } from '../oauth/scopes';
import Link from '../../components/Link';
import OAuthClientDialog from './OAuthClientDialog';
import OAuthNewClientDialog from './OAuthNewClientDialog';

/** osu!web's OAuth settings: the applications you let in, and your own. */
export default function OAuthSettings() {
	const { t, i18n } = useLingui();
	const [authorized, setAuthorized] = useState<AuthorizedClient[]>();
	const [own, setOwn] = useState<OwnClient[]>();
	const [editing, setEditing] = useState<OwnClient | 'new'>();

	useEffect(() => {
		void getAuthorizedClients().then(setAuthorized);
		void getOwnClients().then(setOwn);
	}, []);

	if (!authorized || !own) return <Trans>Loading…</Trans>;

	const revoke = async (client: AuthorizedClient) => {
		if (!confirm(t`Revoke access for ${client.name}?`)) return;
		await revokeClient(client.id);
		setAuthorized(authorized.filter(a => a.id !== client.id));
	};

	const saved = (client: OwnClient) => {
		setOwn(own.some(c => c.id === client.id)
			? own.map(c => c.id === client.id ? client : c)
			: [...own, client]);
		setEditing(client);
	};

	const close = () => setEditing(undefined);

	const deleted = (id: number) => {
		setOwn(own.filter(c => c.id !== id));
		setEditing(undefined);
	};

	return <>
		<h3 className='oauth__heading'><Trans>Authorized Clients</Trans></h3>
		{authorized.length === 0 && <div className='settings__hint'>
			<Trans>No authorized clients.</Trans>
		</div>}
		{authorized.map(client => <div key={client.id} className='oauth__client'>
			<div className='oauth__client-info'>
				<div className='oauth__client-name'>{client.name}</div>
				{client.owner.name && <div><Trans>owned by {client.owner.name}</Trans></div>}
				<ul className='oauth__scopes'>
					{client.scopes.map(s => <li key={s}>{i18n._(SCOPE_TEXT[s])}</li>)}
				</ul>
			</div>
			<button type='button' className='oauth__button' onClick={() => void revoke(client)}>
				<Trans>Revoke Access</Trans>
			</button>
		</div>)}

		<h3 className='oauth__heading'><Trans>Own Clients</Trans></h3>
		{own.map(client => <div key={client.id} className='oauth__client'>
			<div className='oauth__client-name'>{client.name}</div>
			<button type='button' className='oauth__button' onClick={() => setEditing(client)}>
				<Trans>Edit</Trans>
			</button>
		</div>)}
		<div className='oauth__actions'>
			<button type='button' className='oauth__button' onClick={() => setEditing('new')}>
				<Trans>New OAuth Application</Trans>
			</button>
			<Link to='/docs'><Trans>API documentation</Trans></Link>
		</div>

		{editing === 'new' && <OAuthNewClientDialog onSaved={saved} onClose={close} />}
		{editing && editing !== 'new' && <OAuthClientDialog
			key={editing.id}
			client={editing}
			onSaved={saved}
			onDeleted={deleted}
			onClose={close}
		/>}
	</>;
}
