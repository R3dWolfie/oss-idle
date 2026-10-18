import { useState } from 'react';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import {
	resetClientSecret,
	type OwnClient,
} from '../../api/oauth';

/** An application's client id and secret: the secret hidden until asked for, and its reset. */
export default function OAuthClientSecret({ client, onReset }: {
	client: OwnClient;
	onReset: (client: OwnClient) => void;
}) {
	const { t } = useLingui();
	const [shown, setShown] = useState(false);

	const reset = async () => {
		if (!confirm(t`Reset the client secret? Applications using the old one will stop working.`)) return;
		onReset(await resetClientSecret(client.id));
		setShown(true);
	};

	return <>
		<label className='oauth-dialog__label'><Trans>Client ID</Trans></label>
		<input readOnly value={client.id} />
		<label className='oauth-dialog__label'><Trans>Client Secret</Trans></label>
		{shown && <input readOnly value={client.secret} />}
		<div className='oauth-dialog__secret-buttons'>
			{!shown && <button type='button' className='oauth__button' onClick={() => setShown(true)}>
				<Trans>Show client secret</Trans>
			</button>}
			<button type='button' className='oauth__button' onClick={() => void reset()}>
				<Trans>Reset client secret</Trans>
			</button>
		</div>
	</>;
}
