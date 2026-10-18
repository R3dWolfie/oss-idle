import './Store.css';
import { Trans } from '@lingui/react/macro';
import useAsync from '@osu-idle/shared/hooks/useAsync';
import Link from '../../components/Link';
import {
	useAuthLoaded,
	useCurrentUser,
} from '../../hooks/useCurrentUser';
import { getSupporterStatus } from '../../api/store';
import SupporterStatus from './SupporterStatus';
import SupporterTag from './SupporterTag';
import OrderHistory from './OrderHistory';
import SupporterPerks from './SupporterPerks';

/** The store: the supporter tag, and the account's orders. */
export default function Store({ tab, paid }: { tab: 'products' | 'orders'; paid: boolean }) {
	const me = useCurrentUser();
	const authLoaded = useAuthLoaded();
	const status = useAsync(() => me ? getSupporterStatus() : Promise.resolve(undefined), [me?.id]);

	if (!authLoaded) return null;
	if (!me) {
		return <div className='page-contents'>
			<Trans><Link to='/login'>Sign in</Link> to support osu!idle.</Trans>
		</div>;
	}

	const tabClass = (name: typeof tab) => `store__tab ${tab === name ? 'active' : ''}`;

	return <div className='store'>
		<nav className='store__tabs'>
			<Link to='/store' search={{ tab: 'products' }} className={tabClass('products')}>
				<Trans>products</Trans>
			</Link>
			<Link to='/store' search={{ tab: 'orders' }} className={tabClass('orders')}>
				<Trans>order history</Trans>
			</Link>
		</nav>
		{status && <SupporterStatus status={status} paid={paid} />}
		{tab === 'products'
			? <>
				<SupporterTag me={me} subscribed={status?.customer ?? false} />
				<SupporterPerks />
			</>
			: <OrderHistory />}
	</div>;
}
