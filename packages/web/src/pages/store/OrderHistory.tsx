import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import { ph } from '@lingui/core/macro';
import useAsync from '@oss-idle/shared/hooks/useAsync';
import Link from '../../components/Link';
import { getOrders } from '../../api/store';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import SupportDuration from './SupportDuration';
import { euros } from './euros';

/** Every tag this account bought or was given. */
export default function OrderHistory() {
	const { i18n } = useLingui();
	const me = useCurrentUser();
	const orders = useAsync(getOrders, []);
	const mine = (id: number | undefined) => id !== undefined && id === me?.id;

	if (!orders) return <div className='page-contents'><Trans>Loading…</Trans></div>;
	if (!orders.length) return <div className='store__empty'><Trans>No orders.</Trans></div>;

	return <table className='store__orders'>
		<thead>
			<tr>
				<th><Trans>Date</Trans></th>
				<th><Trans>Supporter tag</Trans></th>
				<th><Trans>For</Trans></th>
				<th><Trans>Amount</Trans></th>
			</tr>
		</thead>
		<tbody>
			{orders.map(o => <tr key={o.id}>
				<td>{i18n.date(new Date(o.at), { dateStyle: 'medium' })}</td>
				<td>
					<SupportDuration months={o.months} />
					{o.recurring && <span className='store__renewal'><Trans>subscription</Trans></span>}
				</td>
				<td>
					{mine(o.recipientId) && mine(o.buyerId) && <Trans>yourself</Trans>}
					{mine(o.recipientId) && !mine(o.buyerId)
						&& <Trans>gift from {ph({ name: o.buyerName ?? '' })}</Trans>}
					{!mine(o.recipientId) && (o.recipientCharacterId
						? <Link to='/c/$id' params={{ id: String(o.recipientCharacterId) }}>{o.recipientName}</Link>
						: o.recipientName)}
				</td>
				<td>
					{euros(o.amount)}
					{o.refunded > 0 && <span className='store__renewal'>
						<Trans>refunded {ph({ amount: euros(o.refunded) })}</Trans>
					</span>}
				</td>
			</tr>)}
		</tbody>
	</table>;
}
