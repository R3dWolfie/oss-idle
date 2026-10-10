import './ChatReports.css';
import {
	useEffect,
	useState,
} from 'react';
import type { ReportReason } from '@osu-idle/shared/social';
import Link from '../../components/Link';
import {
	getReports,
	resolveReport,
} from '../../api/social';

type Reports = Awaited<ReturnType<typeof getReports>>;

const REASON: Record<ReportReason, string> = {
	cheating: 'Cheating',
	multiple_accounts: 'Using multiple accounts',
	chat: 'Inappropriate chat behaviour',
	content: 'Inappropriate content',
	other: 'Other',
};

const when = (at: string) => new Date(at).toLocaleString();

/** Players' reports, open ones first; resolving one just marks it handled. */
export default function ChatReports({ onCount }: { onCount: (open: number) => void }) {
	const [reports, setReports] = useState<Reports>();
	const [error, setError] = useState<string>();

	const refresh = () => getReports()
		.then(r => {
			setReports(r);
			onCount(r.filter(x => !x.resolvedAt).length);
		})
		.catch(e => setError(String((e as Error).message ?? e)));

	useEffect(() => { void refresh(); }, []);

	if (error) return <p className='chat-console__error'>{error}</p>;
	if (!reports) return <p className='chat-console__muted'>Loading…</p>;
	if (!reports.length) return <p className='chat-console__muted'>No reports.</p>;

	return (
		<div className='chat-reports'>
			{reports.map(r => (
				<div key={r.id} className='chat-reports__row' data-resolved={!!r.resolvedAt}>
					<div className='chat-reports__head'>
						<span className='chat-console__time'>{when(r.createdAt)}</span>
						<Link to='/c/$id' params={{ id: String(r.from.characterId) }}>{r.from.name}</Link>
						<span>reported</span>
						<Link to='/c/$id' params={{ id: String(r.target.characterId) }}>{r.target.name}</Link>
						<span className='chat-reports__reason'>{REASON[r.reason]}</span>
						{!r.resolvedAt && <button type='button' onClick={() => void resolveReport(r.id).then(refresh)}>
							Resolve
						</button>}
					</div>
					<div className='chat-reports__comment'>{r.comment}</div>
				</div>
			))}
		</div>
	);
}
