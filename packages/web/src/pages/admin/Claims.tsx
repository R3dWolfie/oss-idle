import './Medals.css';

import {
	useCallback,
	useEffect,
	useState,
} from 'react';
import { dateAgo } from '@osu-idle/shared/display/ago';
import Link from '../../components/Link';
import OutLink from '../../components/OutLink';
import {
	acceptMapClaim,
	listMapClaims,
	rejectMapClaim,
	type MapClaim,
} from '../../api/mapRequests';
import { useCurrentUser } from '../../hooks/useCurrentUser';

/** Temporary: who claims to have proposed which ranked map on Discord. Accepting attributes the map to them. */
export default function Claims() {
	const me = useCurrentUser();
	const [claims, setClaims] = useState<MapClaim[]>();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string>();

	const refresh = useCallback(() => listMapClaims()
		.then(setClaims)
		.catch(e => setError(String((e as Error).message ?? e))), []);

	useEffect(() => { void refresh(); }, [refresh]);

	const run = async (fn: () => Promise<unknown>) => {
		setBusy(true);
		setError(undefined);
		try {
			await fn();
		} catch (e) {
			setError(String((e as Error).message ?? e));
		}
		await refresh();
		setBusy(false);
	};

	const claimers = new Map<number, number>();
	for (const claim of claims ?? []) claimers.set(claim.setId, (claimers.get(claim.setId) ?? 0) + 1);

	return <main className='admin-medals'>
		<p className='admin-medals__meta'>
			Players send their picks from <Link to='/maps/claim'>/maps/claim</Link>.
			Accepting one attributes the map to that player and drops the other claims on it.
			Mine attributes it to you instead.
		</p>
		{error && <p>{error}</p>}
		{!claims && <p>Loading…</p>}
		{claims && !claims.length && <p>No claims.</p>}
		{!!claims?.length && <table>
			<thead><tr><th>Map</th><th>Mapper</th><th>Claimed by</th><th>Ranked</th><th>Registered</th><th>When</th><th></th></tr></thead>
			<tbody>
				{claims.map(claim => <tr key={`${claim.setId}-${claim.userId}`}>
					<td>
						<OutLink href={`https://osu.ppy.sh/beatmapsets/${claim.osuId}`} target='_blank'>
							{claim.artist} - {claim.title}
						</OutLink>
						{(claimers.get(claim.setId) ?? 0) > 1 && <b> (contested)</b>}
					</td>
					<td>{claim.creator}</td>
					<td>
						{claim.characterId
							? <Link to='/c/$id' params={{ id: String(claim.characterId) }}>
								{claim.username ?? claim.userId}
							</Link>
							: claim.username ?? claim.userId}
					</td>
					<td>{dateAgo(claim.rankedAt)}</td>
					<td>
						{dateAgo(claim.registeredAt)}
						{!!claim.rankedAt && !!claim.registeredAt
							&& claim.registeredAt > claim.rankedAt && <b> (after ranking)</b>}
					</td>
					<td>{dateAgo(claim.createdAt)}</td>
					<td>
						<button disabled={busy} onClick={() => void run(() => acceptMapClaim(claim.setId, claim.userId))}>
							Accept
						</button>
						{' '}
						<button disabled={busy} onClick={() => void run(() => rejectMapClaim(claim.setId, claim.userId))}>
							Reject
						</button>
						{me && <>
							{' '}
							<button disabled={busy} onClick={() => void run(() => acceptMapClaim(claim.setId, me.id))}>
								Mine
							</button>
						</>}
					</td>
				</tr>)}
			</tbody>
		</table>}
	</main>;
}
