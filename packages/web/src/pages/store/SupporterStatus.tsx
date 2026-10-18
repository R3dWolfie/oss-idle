import {
	Plural,
	Trans,
	useLingui,
} from '@lingui/react/macro';
import { ph } from '@lingui/core/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart } from '@fortawesome/free-solid-svg-icons/faHeart';
import type { getSupporterStatus } from '../../api/store';
import SupportDuration from './SupportDuration';
import { euros } from './euros';

type Status = Awaited<ReturnType<typeof getSupporterStatus>>;

/** The account's tag and what it gave so far. */
export default function SupporterStatus({ status, paid }: { status: Status; paid: boolean }) {
	const { i18n } = useLingui();
	const until = status.until && i18n.date(new Date(status.until), { dateStyle: 'long' });

	return <div className='store__status'>
		<div className={`store__heart ${status.until ? 'active' : ''}`}>
			<FontAwesomeIcon icon={faHeart} />
		</div>
		<div className='store__status-text'>
			{paid && <p className='store__paid'>
				<Trans>Payment received, thank you! Your tag shows up as soon as Stripe confirms it.</Trans>
			</p>}
			<p className='store__until'>
				{until
					? <Trans>Your supporter tag is valid until <b>{ph({ until })}</b>.</Trans>
					: <Trans>You don't have a supporter tag right now.</Trans>}
			</p>
			{status.contributed > 0 && <p>
				<Trans>
					So far you gave <b>{ph({ amount: euros(status.contributed) })}</b>, and held a supporter tag
					for <b><SupportDuration months={status.months} /></b>.
				</Trans>
			</p>}
			{status.gifted > 0 && <p>
				<Trans>
					<b>{ph({ amount: euros(status.gifted) })}</b> of it went to <b>
						<Plural
							value={ph({ players: status.giftedPlayers })}
							one='# other player'
							other='# other players'
						/>
					</b>,
					covering <b><SupportDuration months={status.giftedMonths} /></b>.
				</Trans>
			</p>}
		</div>
	</div>;
}
