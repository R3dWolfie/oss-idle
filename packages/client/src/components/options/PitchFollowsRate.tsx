import { Trans } from '@lingui/react/macro';
import Checkbox from './controls/Checkbox';
import { SETTINGS } from '../../db/settings';

/** Off: a sped-up or slowed-down song keeps its pitch. */
export default function PitchFollowsRate() {
	return <Checkbox value={SETTINGS.pitchFollowsRate} label={
		<Trans>Pitch follows the rate (Double and Half mods)</Trans>
	} />;
}
