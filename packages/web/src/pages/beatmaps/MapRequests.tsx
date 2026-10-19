import { ph } from '@lingui/core/macro';
import './MapRequests.css';

import {
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import Link from '../../components/Link';
import MapsNav from './MapsNav';
import RequestForm from './RequestForm';
import RequestRow from './RequestRow';
import RequestBulkBar, { type BulkProgress } from './RequestBulkBar';
import {
	deleteMapRequest,
	ingestMapRequest,
	listMapRequests,
	resolveMapRequest,
	toggleMapSupport,
	type MapRequest,
} from '../../api/mapRequests';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useAdmin } from '../../hooks/useAdmin';

export type RequestFilter = 'open' | 'accepted' | 'rejected' | 'all';
export type RequestSort = 'support' | 'date';

const PAGE_SIZE = 20;

const time = (iso: string | null) => iso ? new Date(iso).getTime() : 0;

const matches = (row: MapRequest, filter: RequestFilter): boolean => {
	if (filter === 'all') return true;
	if (filter === 'open') return row.status === 'pending';
	return row.status === filter;
};

export default function MapRequests({ filter, sort, page }: {
	filter: RequestFilter,
	sort: RequestSort,
	page: number,
}) {
	const { t } = useLingui();
	const user = useCurrentUser();
	const admin = useAdmin();

	const [list, setList] = useState<MapRequest[]>();
	const [error, setError] = useState<string>();
	const [busy, setBusy] = useState(false);
	const [selected, setSelected] = useState(new Set<number>());
	const [progress, setProgress] = useState<BulkProgress>();

	const refresh = useCallback(() => listMapRequests()
		.then(setList)
		.catch(e => setError(String((e as Error).message ?? e))), []);

	useEffect(() => { void refresh(); }, [refresh]);

	const run = async (fn: () => Promise<unknown>) => {
		setBusy(true);
		setError(undefined);
		try {
			await fn();
			await refresh();
		} catch (e) {
			setError(String((e as Error).message ?? e));
		} finally {
			setBusy(false);
		}
	};

	// One at a time, so the mirror is not hit with every download at once.
	const bulk = async (fn: (setId: number) => Promise<unknown>) => {
		const ids = [...selected];
		const failed: string[] = [];
		const startedAt = Date.now();
		setBusy(true);
		setError(undefined);
		for (const [i, setId] of ids.entries()) {
			const row = list?.find(r => r.setId === setId);
			setProgress({
				done: i,
				total: ids.length,
				current: row ? `${row.artist} - ${row.title}` : String(setId),
				startedAt,
			});
			try {
				await fn(setId);
			} catch (e) {
				failed.push(`${setId}: ${String((e as Error).message ?? e)}`);
			}
		}
		setProgress(undefined);
		setSelected(new Set());
		if (failed.length) setError(failed.join('\n'));
		await refresh();
		setBusy(false);
	};

	const toggleSelect = (setId: number) => setSelected(prev => {
		const next = new Set(prev);
		if (!next.delete(setId)) next.add(setId);
		return next;
	});

	const rows = useMemo(() => {
		const kept = (list ?? []).filter(row => matches(row, filter));
		return kept.sort((a, b) => sort === 'support'
			? b.support - a.support || time(b.createdAt) - time(a.createdAt)
			: time(b.createdAt) - time(a.createdAt));
	}, [list, filter, sort]);

	const pending = (list ?? [])
		.filter(row => row.status === 'pending' && row.userId === user?.id).length;

	const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
	const current = Math.min(page, pageCount);
	const shown = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

	const filters: [RequestFilter, string][] = [
		['open', t`open`],
		['accepted', t`accepted`],
		['rejected', t`rejected`],
		['all', t`all`],
	];
	const sorts: [RequestSort, string][] = [
		['support', t`most wanted`],
		['date', t`newest`],
	];

	return (
		<main>
			<MapsNav current='requests' />

			<div className='page-contents'>
				<p className='requests__intro'>
					<Trans>
						Anyone can propose a map for ranking in oss!idle - osu!mania 4K only.
						Support the ones you want to play so it shows what people are after.
						Accepted maps join the nomination queue and are ranked from there.
					</Trans>
				</p>

				{user
					? <RequestForm pending={pending} onSubmitted={refresh} />
					: <p className='requests__signed-out'>
						<Trans>
							<Link to='/login'>Sign in</Link> to propose a map or support someone else's.
						</Trans>
					</p>}

				{error && <p className='requests__error'>{error}</p>}

				<div className='requests__toolbar'>
					<div className='requests__tabs'>
						{filters.map(([id, label]) => (
							<Link
								key={id}
								to='/maps/requests'
								search={{
									filter: id, sort, page: 1,
								}}
								className={`requests__tab ${id === filter ? 'current' : ''}`}
							>
								{label}
							</Link>
						))}
					</div>
					<div className='requests__tabs'>
						<span className='requests__muted'><Trans>Sort by</Trans></span>
						{sorts.map(([id, label]) => (
							<Link
								key={id}
								to='/maps/requests'
								search={{
									filter, sort: id, page: 1,
								}}
								className={`requests__tab ${id === sort ? 'current' : ''}`}
							>
								{label}
							</Link>
						))}
					</div>
				</div>

				{!list && <p className='requests__muted'><Trans>Loading…</Trans></p>}
				{list && !rows.length && <p className='requests__muted'><Trans>Nothing here yet.</Trans></p>}

				{admin && (
					<RequestBulkBar
						count={selected.size}
						progress={progress}
						busy={busy}
						onSelectPage={() => setSelected(new Set(shown
							.filter(row => row.status === 'pending')
							.map(row => row.setId)))}
						onClear={() => setSelected(new Set())}
						onIngest={() => void bulk(ingestMapRequest)}
						onAccept={() => void bulk(setId => resolveMapRequest(setId, 'accepted'))}
						onReject={() => void bulk(setId => resolveMapRequest(setId, 'rejected'))}
						onDelete={() => confirm(t`Drop ${ph({ count: selected.size })} requests?`)
							&& void bulk(deleteMapRequest)}
					/>
				)}

				<div className='requests__list'>
					{shown.map(row => (
						<RequestRow
							key={row.setId}
							row={row}
							mine={row.userId === user?.id}
							admin={admin}
							busy={busy}
							selected={selected.has(row.setId)}
							onSelect={toggleSelect}
							onSupport={setId => void run(() => toggleMapSupport(setId))}
							onResolve={(setId, status, note) => void run(() => resolveMapRequest(setId, status, note))}
							onIngest={setId => void run(() => ingestMapRequest(setId))}
							onDelete={setId => confirm(t`Drop this request?`)
								&& void run(() => deleteMapRequest(setId))}
						/>
					))}
				</div>

				{pageCount > 1 && (
					<div className='requests__pager'>
						{Array.from({ length: pageCount }, (_, i) => i + 1).map(n => (
							<Link
								key={n}
								to='/maps/requests'
								search={{
									filter, sort, page: n,
								}}
								className={`requests__tab ${n === current ? 'current' : ''}`}
							>
								{n}
							</Link>
						))}
					</div>
				)}
			</div>
		</main>
	);
}
