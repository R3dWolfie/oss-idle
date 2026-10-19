import './AccountStanding.css';
import { ph } from '@lingui/core/macro';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import useAsync from '@oss-idle/shared/hooks/useAsync';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useModerator } from '../../hooks/useAdmin';
import { getStanding } from '../../api/restrictions';
import SanctionLength from './SanctionLength';

/** osu-web's Account Standing block, for the player and the moderators, once there is
 *  something to show. */
export default function AccountStanding({ userId, name }: { userId: number; name: string }) {
	const { t } = useLingui();
	const moderator = useModerator();
	const allowed = useCurrentUser()?.id === userId || moderator;
	const standing = useAsync(() => allowed ? getStanding(userId) : undefined, [userId, allowed]);
	if (!standing) return null;
	const { silencedUntil, silenced, restricted, history } = standing;
	const bad = silenced || restricted || !!silencedUntil;
	if (!bad && !history.length) return null;

	const actions = {
		silence: t`Silence`, restriction: t`Restriction`,
	};

	return <div className='character__block account-standing'>
		<div className='character__block-title'><Trans>Account Standing</Trans></div>
		{bad && <div className='account-standing__alert'>
			<Trans>{ph({ name })}'s account is not in a good standing.</Trans>
		</div>}
		{silencedUntil && <p>
			<Trans>{ph({ name })} will be able to speak again in <SanctionLength seconds={(silencedUntil - Date.now()) / 1000} />.</Trans>
		</p>}
		{silenced && <p><Trans>{ph({ name })} is silenced until a moderator lifts it.</Trans></p>}
		<div className='character__block-section-title'><Trans>Recent Infringements</Trans></div>
		<table className='account-standing__table'>
			<thead><tr>
				<th><Trans>Date</Trans></th>
				<th><Trans>Action</Trans></th>
				<th><Trans>Length</Trans></th>
				<th><Trans>Description</Trans></th>
				{moderator && <th><Trans>Moderator</Trans></th>}
			</tr></thead>
			<tbody>
				{history.map(h => <tr key={h.id}>
					<td>{new Date(h.at).toLocaleString()}</td>
					<td>{actions[h.action]}</td>
					<td>{h.action === 'silence' ? <SanctionLength seconds={h.seconds} /> : '-'}</td>
					<td>{h.reason}</td>
					{moderator && <td>{h.actor ?? '-'}</td>}
				</tr>)}
			</tbody>
		</table>
	</div>;
}
