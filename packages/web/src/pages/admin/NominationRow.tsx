import { useState } from 'react';
import {
	type Nomination,
	type NominationPatch,
	nominationOszUrl,
} from '../../api/maps';
import NominationCover from './NominationCover';
import NominationDiffs from './NominationDiffs';
import { phaseOf } from './nominationStatus';
import type { MapTag } from '@oss-idle/shared/beatmap';
import NominationMeta from './NominationMeta';
import { formatDate } from './formatDate';

/** ISO timestamp -> value for an <input type="datetime-local"> (local time). */
const toLocalInput = (iso: string | null): string => {
	if (!iso) return '';
	const d = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const HOUR = 3600e3;
// Quick-schedule windows: a random moment within the next hour/day/week/month.
const WINDOWS: [label: string, ms: number][] = [
	['hour', HOUR],
	['day', 24 * HOUR],
	['week', 7 * 24 * HOUR],
	['month', 30 * 24 * HOUR],
];

export default function NominationRow({
	row, busy, onPatch, onToggleDiff, onTagDiff, onDelete,
}: {
	row: Nomination;
	busy: boolean;
	onPatch: (
		setId: number,
		body: NominationPatch,
	) => void;
	onToggleDiff: (setId: number, beatmapId: number, ranked: boolean) => void;
	onTagDiff: (setId: number, beatmapId: number, tags: MapTag[]) => void;
	onDelete: (setId: number) => void;
}) {
	const [date, setDate] = useState(toLocalInput(row.rankedAt));

	const phase = phaseOf(row);
	const live = phase === 'live';

	const schedule = () => date && onPatch(row.id, {
		rankedAt: new Date(date).toISOString(), status: 'ranked', 
	});
	const rankNow = () => onPatch(row.id, {
		rankedAt: new Date().toISOString(), status: 'ranked', 
	});
	const scheduleIn = (ms: number) =>
		onPatch(row.id, {
			rankedAt: new Date(Date.now() + Math.random() * ms).toISOString(), status: 'ranked', 
		});
	const unrank = () =>
		confirm('Unrank this set? All scores and progression earned on its '
			+ 'difficulties will be permanently deleted.')
		&& onPatch(row.id, {
			status: 'pending', rankedAt: null,
		});
	const reject = () => onPatch(row.id, { status: 'rejected' });
	// a player's own map, submitted for rank: theirs again, with the reason why
	const player = !!row.submittedBy;
	const sendBack = () => {
		const note = prompt('Why does it go back to its mapper? They see this.');
		if (note !== null) onPatch(row.id, {
			status: 'unranked', note, 
		});
	};

	return (
		<div className='nomination__entry'>
			<div className='nomination__info'>
				<NominationCover row={row} />
				<NominationMeta row={row} player={player} />

				<span className={`nomination__badge nomination__badge--${phase}`}>{phase}</span>

				<div className='nomination__stat'>
					<span className='nomination__label'>Diffs</span>
					<span>{row.diffs.filter(d => d.ranked).length}/{row.diffs.length}</span>
				</div>
				<div className='nomination__stat'>
					<span className='nomination__label'>Plays</span>
					<span>{row.plays ?? 0}</span>
				</div>
				<div className='nomination__stat'>
					<span className='nomination__label'>Submitted</span>
					<span>{formatDate(row.submittedAt)}</span>
				</div>
				<div className='nomination__stat'>
					<span className='nomination__label'>Ranked</span>
					{live
						? <span>{formatDate(row.rankedAt)}</span>
						: <input 
							className='nomination__field'
							type='datetime-local'
							value={date} 
							disabled={busy} 
							onChange={e => setDate(e.target.value)}
						/>}
				</div>
			</div>

			<NominationDiffs
				diffs={row.diffs}
				busy={busy}
				live={live}
				onToggle={(beatmapId, ranked) => onToggleDiff(row.id, beatmapId, ranked)}
				onTags={(beatmapId, tags) => onTagDiff(row.id, beatmapId, tags)}
			/>

			<div className='nomination__actions'>
				<button
					className={`nomination__tag ${row.bundled ? 'is-on' : ''}`}
					disabled={busy}
					onClick={() => onPatch(row.id, { bundled: !row.bundled })}
				>
					Bundled
				</button>
				<button
					className={`nomination__tag ${row.categorized ? 'is-on' : ''}`}
					disabled={busy}
					onClick={() => onPatch(row.id, { categorized: !row.categorized })}
				>
					Categorized
				</button>
				{!live && (
					<div className='nomination__quick'>
						<span className='nomination__label'>Random in</span>
						{WINDOWS.map(([label, ms]) => (
							<button key={label} className='nomination__btn' disabled={busy}
								title={`Schedule randomly within the next ${label}`} onClick={() => scheduleIn(ms)}>
								{label}
							</button>
						))}
					</div>
				)}
				{!live && <button 
					className='nomination__btn nomination__btn--primary' 
					disabled={busy || !date} 
					onClick={schedule}
				>
					Schedule
				</button>}
				{!live && <button className='nomination__btn' disabled={busy} onClick={rankNow}>Rank now</button>}
				{row.status === 'ranked' && <button 
					className='nomination__btn' 
					disabled={busy} 
					onClick={unrank}
				>
					Unrank
				</button>}
				{row.status === 'pending' && <button
					className='nomination__btn nomination__btn--warn' 
					disabled={busy} 
					onClick={player ? sendBack : reject}
				>
					{player ? 'Send back' : 'Reject'}
				</button>}
				<a className='nomination__btn' href={nominationOszUrl(row.id)} download>Download</a>
				<button 
					className='nomination__btn nomination__btn--danger'
					disabled={busy}
					onClick={() => onDelete(row.id)}
				>
					Delete
				</button>
			</div>
		</div>
	);
}
