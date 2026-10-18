import './Medals.css';
import {
	useCallback,
	useEffect,
	useState,
} from 'react';
import Link from '../../components/Link';
import {
	listAllOrders,
	refundUnused,
	type AdminOrder,
} from '../../api/store';
import { euros } from '../store/euros';

const day = (ms: number | undefined) => ms ? new Date(ms).toLocaleDateString() : '-';

/** Supporter orders. A refund gives back the part of the tag not used yet, and the tag shrinks
 *  by as much once Stripe confirms it. */
export default function Orders() {
	const [orders, setOrders] = useState<AdminOrder[]>();
	const [confirm, setConfirm] = useState<number>();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string>();

	const refresh = useCallback(() => listAllOrders()
		.then(setOrders)
		.catch(e => setError(String((e as Error).message ?? e))), []);

	useEffect(() => { void refresh(); }, [refresh]);

	const refund = async (id: number) => {
		setBusy(true);
		setError(undefined);
		try {
			await refundUnused(id);
		} catch (e) {
			setError(String((e as Error).message ?? e));
		}
		setConfirm(undefined);
		// the webhook applies the cut a moment later
		setTimeout(() => void refresh().then(() => setBusy(false)), 2000);
	};

	return <main className='admin-medals'>
		<p className='admin-medals__meta'>
			Refund gives back the share of the tag that is not used yet. A subscription keeps renewing:
			cancel it from the Stripe dashboard too if needed. A refund made in the dashboard cuts the tag the same way.
		</p>
		{error && <p>{error}</p>}
		{!orders && <p>Loading…</p>}
		{orders && !orders.length && <p>No orders.</p>}
		{!!orders?.length && <table>
			<thead>
				<tr>
					<th>Date</th><th>Buyer</th><th>For</th><th>Months</th><th>Period</th>
					<th>Paid</th><th>Refunded</th><th></th>
				</tr>
			</thead>
			<tbody>
				{orders.map(o => <tr key={o.id}>
					<td>{day(o.at)}</td>
					<td>{o.buyerName ?? o.buyerId}</td>
					<td>
						{o.recipientCharacterId
							? <Link to='/c/$id' params={{ id: String(o.recipientCharacterId) }}>
								{o.recipientName ?? o.recipientId}
							</Link>
							: o.recipientName ?? o.recipientId}
					</td>
					<td>{o.months}{o.recurring && ' (subscription)'}</td>
					<td>{day(o.startsAt)} → {day(o.endsAt)}</td>
					<td>{euros(o.amount)}</td>
					<td>{o.refunded ? euros(o.refunded) : '-'}</td>
					<td>
						{o.unused > 0 && (confirm === o.id
							? <button disabled={busy} onClick={() => void refund(o.id)}>
								Confirm refund of {euros(o.unused)}
							</button>
							: <button disabled={busy} onClick={() => setConfirm(o.id)}>
								Refund {euros(o.unused)}
							</button>)}
					</td>
				</tr>)}
			</tbody>
		</table>}
	</main>;
}
