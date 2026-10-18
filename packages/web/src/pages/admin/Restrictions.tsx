import './Medals.css';
import {
	useCallback,
	useEffect,
	useState,
} from 'react';
import Link from '../../components/Link';
import {
	liftRestriction,
	listRestricted,
	type RestrictedAccount,
} from '../../api/restrictions';

/** Restricted accounts. Restrict from a profile's ⋮ menu; a chargeback restricts the buyer by itself. */
export default function Restrictions() {
	const [accounts, setAccounts] = useState<RestrictedAccount[]>();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string>();

	const refresh = useCallback(() => listRestricted()
		.then(setAccounts)
		.catch(e => setError(String((e as Error).message ?? e))), []);

	useEffect(() => { void refresh(); }, [refresh]);

	const lift = async (userId: number) => {
		setBusy(true);
		setError(undefined);
		try {
			await liftRestriction(userId);
		} catch (e) {
			setError(String((e as Error).message ?? e));
		}
		await refresh();
		setBusy(false);
	};

	return <main className='admin-medals'>
		<p className='admin-medals__meta'>
			A restricted account can't play, chat or buy, and is hidden from everyone else: rankings,
			leaderboards, #1s, profiles and the online list. Restrict one from the ⋮ menu of its profile.
			Lifting puts everything back.
		</p>
		{error && <p>{error}</p>}
		{!accounts && <p>Loading…</p>}
		{accounts && !accounts.length && <p>No restricted accounts.</p>}
		{!!accounts?.length && <table>
			<thead><tr><th>Player</th><th>osu! account</th><th>Since</th><th>Reason</th><th></th></tr></thead>
			<tbody>
				{accounts.map(a => <tr key={a.userId}>
					<td>
						{a.characterId
							? <Link to='/c/$id' params={{ id: String(a.characterId) }}>{a.name}</Link>
							: '-'}
					</td>
					<td>{a.username}</td>
					<td>{a.at ? new Date(a.at).toLocaleString() : '-'}</td>
					<td>{a.reason}</td>
					<td>
						<button disabled={busy} onClick={() => void lift(a.userId)}>Lift</button>
					</td>
				</tr>)}
			</tbody>
		</table>}
	</main>;
}
