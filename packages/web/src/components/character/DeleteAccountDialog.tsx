import './ReportDialog.css';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLingui } from '@lingui/react/macro';
import { ph } from '@lingui/core/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import useAsync from '@oss-idle/shared/hooks/useAsync';
import { getUser } from '../../api/users';
import { deleteAccount } from '../../api/accounts';

/** Admin: delete an account for good, on its owner's request. Typing the osu! username again
 *  is the confirmation. */
export default function DeleteAccountDialog({ userId, onDone, onClose }: {
	userId: number;
	onDone: () => void;
	onClose: () => void;
}) {
	const { t } = useLingui();
	const user = useAsync(() => getUser(userId), [userId]);
	const [typed, setTyped] = useState('');
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string>();
	const username = user?.username ?? '';

	const send = async () => {
		setSending(true);
		try {
			await deleteAccount(userId, typed);
			onDone();
		} catch (e) {
			setError((e as Error).message);
			setSending(false);
		}
	};

	return createPortal(<>
		<div className='__blackout visible' onClick={onClose} />
		<div className='report-dialog' role='dialog'>
			<FontAwesomeIcon icon={faTrash} className='report-dialog__icon' />
			<div className='report-dialog__title'>{t`Delete ${ph({ username })}'s account?`}</div>
			<div className='report-dialog__label'>
				{t`Every character, score and upload goes, for good. Payment records stay, without the account.`}
				{' '}
				{t`Type the osu! username to confirm.`}
			</div>
			<input value={typed} onChange={e => setTyped(e.target.value)} placeholder={username} />
			{error && <div className='report-dialog__error'>{error}</div>}
			<button
				type='button'
				className='report-dialog__btn report-dialog__btn--send'
				disabled={sending || !username || typed !== username}
				onClick={() => void send()}
			>{t`Delete for good`}</button>
			<button type='button' className='report-dialog__btn' onClick={onClose}>
				{t`Cancel`}
			</button>
		</div>
	</>, document.body,
	);
}
