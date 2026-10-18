import { useState } from 'react';
import { Trans } from '@lingui/react/macro';
import {
	createClient,
	type OwnClient,
} from '../../api/oauth';
import Link from '../../components/Link';
import OAuthDialog from './OAuthDialog';
import {
	callbackUrls,
	useAction,
} from './useAction';

/** osu!web's "Register a new OAuth application". */
export default function OAuthNewClientDialog({ onSaved, onClose }: {
	onSaved: (client: OwnClient) => void;
	onClose: () => void;
}) {
	const [name, setName] = useState('');
	const [redirect, setRedirect] = useState('');
	const [agreed, setAgreed] = useState(false);
	const { busy, error, run } = useAction();

	const register = () => run(async () => {
		onSaved(await createClient({
			name, redirect: callbackUrls(redirect),
		}));
	});

	const title = <Trans>Register a new OAuth application</Trans>;

	return <OAuthDialog title={title} error={error} onClose={onClose}>
		<label className='oauth-dialog__label'><Trans>Application Name</Trans></label>
		<input value={name} maxLength={100} onChange={e => setName(e.target.value)} />
		<label className='oauth-dialog__label'><Trans>Application Callback URLs</Trans></label>
		<textarea value={redirect} onChange={e => setRedirect(e.target.value)} />
		<div className='settings__hint'><Trans>One URL per line.</Trans></div>
		<label className='oauth-dialog__agree'>
			<input type='checkbox' checked={agreed} onChange={e => setAgreed(e.target.checked)} />
			<span>
				<Trans>I agree to the <Link to='/legal/api' target='_blank'>API Terms of Use</Link></Trans>
			</span>
		</label>
		<div className='oauth-dialog__buttons'>
			<button type='button' className='oauth__button' onClick={onClose}><Trans>Cancel</Trans></button>
			<button
				type='button'
				className='oauth__button oauth__button--primary'
				disabled={busy || !agreed || !name.trim() || !redirect.trim()}
				onClick={() => void register()}
			>
				<Trans>Register application</Trans>
			</button>
		</div>
	</OAuthDialog>;
}
