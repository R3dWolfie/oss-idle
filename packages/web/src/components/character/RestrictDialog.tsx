import './ReportDialog.css';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLingui } from '@lingui/react/macro';
import { ph } from '@lingui/core/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';
import { restrictAccount } from '../../api/restrictions';

/** Moderators: restrict an account, with the reason kept for its Account Standing. */
export default function RestrictDialog({ userId, name, onDone, onClose }: {
	userId: number;
	name: string;
	onDone: () => void;
	onClose: () => void;
}) {
	const { t } = useLingui();
	const [reason, setReason] = useState('');
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string>();

	const send = async () => {
		setSending(true);
		try {
			await restrictAccount(userId, reason.trim());
			onDone();
		} catch (e) {
			setError((e as Error).message);
			setSending(false);
		}
	};

	return createPortal(<>
		<div className='__blackout visible' onClick={onClose} />
		<div className='report-dialog' role='dialog'>
			<FontAwesomeIcon icon={faLock} className='report-dialog__icon' />
			<div className='report-dialog__title'>{t`Restrict ${ph({ name })}?`}</div>
			<div className='report-dialog__label'>
				{t`They can't play, chat or buy, and disappear from rankings until you lift it.`}
			</div>
			<textarea
				value={reason}
				onChange={e => setReason(e.target.value)}
				maxLength={255}
				placeholder={t`Reason`}
			/>
			{error && <div className='report-dialog__error'>{error}</div>}
			<button
				type='button'
				className='report-dialog__btn report-dialog__btn--send'
				disabled={sending || !reason.trim()}
				onClick={() => void send()}
			>{t`Restrict`}</button>
			<button type='button' className='report-dialog__btn' onClick={onClose}>
				{t`Cancel`}
			</button>
		</div>
	</>, document.body,
	);
}
