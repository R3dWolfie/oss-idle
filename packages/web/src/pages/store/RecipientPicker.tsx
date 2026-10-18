import { useState } from 'react';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import ProfilePicture from '../../components/ProfilePicture';
import { findRecipient } from '../../api/store';

export type Recipient = {
	userId: number;
	name: string;
	avatarUrl?: string | null;
};

/** Who the tag is for: yourself, or a player you gift it to. */
export default function RecipientPicker({ self, recipient, onChange }: {
	self: Recipient;
	recipient: Recipient | undefined;
	onChange: (recipient: Recipient | undefined) => void;
}) {
	const { t } = useLingui();
	const [searching, setSearching] = useState(false);
	const [name, setName] = useState('');
	const [error, setError] = useState<string>();
	const shown = recipient ?? self;

	const search = async () => {
		setError(undefined);
		try {
			onChange(await findRecipient(name.trim()));
			setSearching(false);
		} catch {
			setError(t`No player goes by that name.`);
		}
	};

	return <div className='store__recipient'>
		<div className='store__recipient-card'>
			<ProfilePicture avatarUrl={shown.avatarUrl ?? undefined} className='store__recipient-avatar' />
			<div className='store__recipient-name'>{shown.name}</div>
			{recipient && <div className='store__recipient-gift'><Trans>gift</Trans></div>}
		</div>
		{searching
			? <form className='store__recipient-search' onSubmit={e => { e.preventDefault(); void search(); }}>
				<input
					value={name}
					onChange={e => setName(e.target.value)}
					placeholder={t`player name`}
					autoFocus
				/>
				<button type='submit' disabled={!name.trim()}><Trans>find</Trans></button>
				{error && <div className='store__error'>{error}</div>}
			</form>
			: <button
				type='button'
				className='store__recipient-button'
				onClick={() => recipient ? onChange(undefined) : setSearching(true)}
			>
				{recipient ? <Trans>for yourself instead</Trans> : <Trans>gift to player</Trans>}
			</button>}
	</div>;
}
