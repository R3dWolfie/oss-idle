import { Trans } from '@lingui/react/macro';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import Checkbox from './controls/Checkbox';
import Auth from '../../online/auth';
import { pmFromAnyone } from '../../online/privateMessages';

export default function PmFromAnyone() {
	const [user] = useSynced(Auth.user);
	if (!user) return <></>;
	return <Checkbox value={pmFromAnyone} label={
		<Trans>Receive messages from anyone</Trans>
	} />;
}
