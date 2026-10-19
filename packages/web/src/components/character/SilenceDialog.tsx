import './ReportDialog.css';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLingui } from '@lingui/react/macro';
import { ph } from '@lingui/core/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentSlash } from '@fortawesome/free-solid-svg-icons';
import { silenceAccount } from '../../api/restrictions';
import SanctionLength from './SanctionLength';

// the chat console's timeouts, then until lifted
const LENGTHS = [600, 3600, 86400, 604800, 2592000, 31536000, 0];

/** Moderators: silence an account (no chat, no private messages), with the reason kept for
 *  its Account Standing. */
export default function SilenceDialog({ userId, name, onDone, onClose }: {
	userId: number;
	name: string;
	onDone: () => void;
	onClose: () => void;
}) {
	const { t } = useLingui();
	const [seconds, setSeconds] = useState(LENGTHS[0]);
	const [reason, setReason] = useState('');
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string>();

	const send = async () => {
		setSending(true);
		try {
			await silenceAccount(userId, seconds, reason.trim());
			onDone();
		} catch (e) {
			setError((e as Error).message);
			setSending(false);
		}
	};

	return createPortal(<>
		<div className='__blackout visible' onClick={onClose} />
		<div className='report-dialog' role='dialog'>
			<FontAwesomeIcon icon={faCommentSlash} className='report-dialog__icon' />
			<div className='report-dialog__title'>{t`Silence ${ph({ name })}?`}</div>
			<div className='report-dialog__label'>
				{t`They can't chat or send private messages until it ends.`}
			</div>
			<div className='report-dialog__lengths'>
				{LENGTHS.map(s => <button
					key={s}
					type='button'
					className={s === seconds ? 'current' : undefined}
					onClick={() => setSeconds(s)}
				><SanctionLength seconds={s} /></button>)}
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
			>{t`Silence`}</button>
			<button type='button' className='report-dialog__btn' onClick={onClose}>
				{t`Cancel`}
			</button>
		</div>
	</>, document.body,
	);
}
