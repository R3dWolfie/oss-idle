import { Trans } from '@lingui/react/macro';
import NotificationBanner from '../NotificationBanner';

/** osu!web's warning on a restricted player's profile. Only admins get this far; the player
 *  sees the site-wide banner instead. */
type Props = {
	restricted: boolean;
	isSelf: boolean;
};

export default function RestrictedProfileNotice({ restricted, isSelf }: Props) {
	if (!restricted || isSelf) return null;
	const title = <Trans>This player is currently restricted.</Trans>;
	return <NotificationBanner type='warning' title={title}>
		<Trans>(only admins can see this)</Trans>
	</NotificationBanner>;
}
