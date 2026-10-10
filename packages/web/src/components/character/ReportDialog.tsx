import './ReportDialog.css';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLingui } from '@lingui/react/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import type { ReportReason } from '@osu-idle/shared/social';
import { report } from '../../api/social';

/** osu!web's report dialog. */
export default function ReportDialog({ userId, name, onClose }: {
	userId: number;
	name: string;
	onClose: () => void;
}) {
	const { t } = useLingui();
	const [reason, setReason] = useState<ReportReason>('cheating');
	const [comment, setComment] = useState('');
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string>();


	const reasons: { value: ReportReason; label: string }[] = [
		{
			value: 'cheating', label: t`Cheating`,
		},
		{
			value: 'multiple_accounts', label: t`Using multiple accounts`,
		},
		{
			value: 'chat', label: t`Inappropriate chat behaviour`,
		},
		{
			value: 'content', label: t`Inappropriate content`,
		},
		{
			value: 'other', label: t`Other (type below)`,
		},
	];

	const send = async () => {
		setSending(true);
		try {
			await report(userId, {
				reason, comment,
			});
			onClose();
		} catch (e) {
			setError((e as Error).message);
			setSending(false);
		}
	};

	return createPortal(<>
		<div className='__blackout visible' onClick={onClose} />
		<div className='report-dialog' role='dialog'>
			<FontAwesomeIcon icon={faTriangleExclamation} className='report-dialog__icon' />
			<div className='report-dialog__title'>{t`Report ${name}?`}</div>
			<div className='report-dialog__label'>{t`Reason`}</div>
			<select value={reason} onChange={e => setReason(e.target.value as ReportReason)}>
				{reasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
			</select>
			<textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={2000} />
			{error && <div className='report-dialog__error'>{error}</div>}
			<button
				type='button'
				className='report-dialog__btn report-dialog__btn--send'
				disabled={sending || !comment.trim()}
				onClick={() => void send()}
			>{t`Send Report`}</button>
			<button type='button' className='report-dialog__btn' onClick={onClose}>
				{t`Cancel`}
			</button>
		</div>
	</>, document.body,
	);
}
