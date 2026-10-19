import { Trans } from '@lingui/react/macro';
import { ph } from '@lingui/core/macro';
import { CONTACT_EMAIL } from '@oss-idle/shared/contact';
import { useCurrentUser } from '../hooks/useCurrentUser';
import NotificationBanner from './NotificationBanner';

/** On every page while the signed-in account is restricted, like osu!web. */
export default function RestrictedBanner() {
	const me = useCurrentUser();
	if (!me?.restricted) return null;
	const mailto = `mailto:${CONTACT_EMAIL}`;
	return <NotificationBanner type='alert' title={<Trans>Your account has been restricted!</Trans>}>
		<Trans>
			While restricted, you can't play, chat or buy anything, and your profile and scores are
			only visible to you. If you think it's a mistake,
			write to <a href={mailto}>{ph({ email: CONTACT_EMAIL })}</a>.
		</Trans>
	</NotificationBanner>;
}
