import { useState } from 'react';
import { Trans } from '@lingui/react/macro';
import type { UserDTO } from '@osu-idle/shared/user';
import { MIN_SUPPORT } from '@osu-idle/shared/supporter';
import Link from '../../components/Link';
import { useCurrentCharacter } from '../../hooks/useCurrentCharacter';
import { inGameBrowser } from '../../auth';
import {
	openPortal,
	startCheckout,
} from '../../api/store';
import RecipientPicker, { type Recipient } from './RecipientPicker';
import SupportSlider from './SupportSlider';

/** The supporter tag: who it is for, how long, and off to Stripe. */
export default function SupporterTag({ me, subscribed }: { me: UserDTO; subscribed: boolean }) {
	const character = useCurrentCharacter();
	const [amount, setAmount] = useState(MIN_SUPPORT);
	const [recipient, setRecipient] = useState<Recipient>();
	const [recurring, setRecurring] = useState(false);
	const [waiver, setWaiver] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string>();

	const go = async (open: () => Promise<{ url: string }>) => {
		setBusy(true);
		setError(undefined);
		try {
			const { url } = await open();
			// Stripe won't load in a frame
			if (inGameBrowser()) {
				window.open(url, '_blank');
				setBusy(false);
			} else window.location.href = url;
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
			setBusy(false);
		}
	};

	const self: Recipient = {
		userId: me.id, name: character?.name ?? me.username, avatarUrl: character?.avatarUrl ?? me.avatarUrl,
	};

	if (me.restricted) {
		return <div className='store__product'>
			<p><Trans>Your account is restricted, so it can't buy anything.</Trans></p>
		</div>;
	}

	return <div className='store__product'>
		<h2 className='store__product-title'><Trans>supporter tag</Trans></h2>
		<div className='store__product-text'>
			<p>
				<Trans>
					osu!idle runs on a server that costs money every month. A supporter tag is how players help pay for it.
					It changes nothing in the game.
				</Trans>
			</p>
			<ul>
				<li><Trans>Buying one while your tag is active adds to the time you have left.</Trans></li>
				<li><Trans>Renewing automatically charges the same amount again at the end of each period. Cancel it any time.</Trans></li>
			</ul>
		</div>

		<RecipientPicker self={self} recipient={recipient} onChange={setRecipient} />
		<SupportSlider amount={amount} onChange={setAmount} />

		<div className='store__checkout'>
			<div className='store__checks'>
				<label className='store__check'>
					<input type='checkbox' checked={recurring} onChange={e => setRecurring(e.target.checked)} />
					<Trans>Renew automatically</Trans>
				</label>
				<label className='store__check'>
					<input type='checkbox' checked={waiver} onChange={e => setWaiver(e.target.checked)} />
					<span>
						<Trans>
							I accept the <Link to='/legal/terms' target='_blank'>terms of sale</Link>,
							I want the supporter tag to start right away, and I give up my 14-day withdrawal right.
						</Trans>
					</span>
				</label>
			</div>
			<div className='store__actions'>
				<button
					type='button'
					className='store__buy'
					disabled={!waiver || busy}
					onClick={() => void go(() => startCheckout({
						amount, recipientId: recipient?.userId, recurring, waiver: true,
					}))}
				>
					<Trans>Checkout</Trans>
				</button>
				{subscribed && <button
					type='button'
					className='store__manage'
					disabled={busy}
					onClick={() => void go(openPortal)}
				>
					<Trans>Manage subscriptions</Trans>
				</button>}
			</div>
			{error && <div className='store__error'>{error}</div>}
		</div>
	</div>;
}
