import { useState } from 'react';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';

export default function RequestActions({
	setId, mine, admin, open, busy, onResolve, onIngest, onDelete,
}: {
	setId: number,
	mine: boolean,
	admin: boolean,
	open: boolean,
	busy: boolean,
	onResolve: (setId: number, status: 'accepted' | 'rejected', note?: string) => void,
	onIngest: (setId: number) => void,
	onDelete: (setId: number) => void,
}) {
	const { t } = useLingui();
	const [note, setNote] = useState('');

	return (
		<div className='request__actions'>
			{admin && open && <>
				<input
					className='request__field'
					value={note}
					disabled={busy}
					placeholder={t`reason (optional)`}
					onChange={e => setNote(e.target.value)}
				/>
				<button
					className='request__btn request__btn--primary'
					disabled={busy}
					title={t`Download the .osz and push it into the nomination queue`}
					onClick={() => onIngest(setId)}
				>
					<Trans>Ingest</Trans>
				</button>
				<button
					className='request__btn'
					disabled={busy}
					onClick={() => onResolve(setId, 'accepted', note || undefined)}
				>
					<Trans>Accept</Trans>
				</button>
				<button
					className='request__btn request__btn--warn'
					disabled={busy}
					onClick={() => onResolve(setId, 'rejected', note || undefined)}
				>
					<Trans>Reject</Trans>
				</button>
			</>}
			<button
				className='request__btn request__btn--danger'
				disabled={busy}
				onClick={() => onDelete(setId)}
			>
				{mine && !admin ? <Trans>Withdraw</Trans> : <Trans>Delete</Trans>}
			</button>
		</div>
	);
}
