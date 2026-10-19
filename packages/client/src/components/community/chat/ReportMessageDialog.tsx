import './ReportMessageDialog.css';
import { useState } from 'react';
import { useLingui } from '@lingui/react/macro';
import Log from '@oss-idle/shared/helpers/log';
import type { ReportReason } from '@oss-idle/shared/social';
import { rpc } from '../../../online/client';
import type { PlayerChatLine } from '../state';

/** osu!web's report dialog, for a chat line: the server quotes the line itself. */
export default function ReportMessageDialog({ line, onClose }: {
	line: PlayerChatLine;
	onClose: () => void;
}) {
	const { t } = useLingui();
	const [reason, setReason] = useState<ReportReason>('chat');
	const [comment, setComment] = useState('');
	const [sending, setSending] = useState(false);

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
		const res = await rpc.v1.social.reports[':userId'].$post({
			param: { userId: String(line.from.userId) },
			json: {
				reason, comment, message: {
					channel: line.channel, id: line.id,
				},
			},
		}).catch(() => undefined);
		if (!res?.ok) {
			setSending(false);
			Log.errorPopup(t`The report could not be sent.`);
			return;
		}
		Log.popup(t`Report sent.`);
		onClose();
	};

	const name = line.from.name;
	return (
		<div className="report-message" onClick={onClose}>
			<div className="report-message__box" role="dialog" onClick={e => e.stopPropagation()}>
				<div className="report-message__title">{t`Report ${name}?`}</div>
				<div className="report-message__quote">{line.text}</div>
				<select value={reason} onChange={e => setReason(e.target.value as ReportReason)}>
					{reasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
				</select>
				<textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={2000} />
				<button
					type="button"
					className="report-message__btn report-message__btn--send"
					disabled={sending || (reason === 'other' && !comment.trim())}
					onClick={() => void send()}
				>{t`Send Report`}</button>
				<button type="button" className="report-message__btn" onClick={onClose}>
					{t`Cancel`}
				</button>
			</div>
		</div>
	);
}
