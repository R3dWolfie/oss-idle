import { Trans } from '@lingui/react/macro';
import useSynced from '@osu-idle/shared/hooks/useSynced';
import { desktop } from '@osu-idle/shared/desktop';
import {
	type FrameLimit,
	SETTINGS,
} from '../../db/settings';
import Dropdown, { type DropdownOption } from '../dropdown/Dropdown';
import { wantsUncapped } from '../../responsive/frameLimiter';

const CAPS = [30, 60, 120, 144, 165, 240, 360];

export default function FrameLimiter() {
	const [limit] = useSynced(SETTINGS.frameLimiter);
	const app = desktop();
	const options: DropdownOption<FrameLimit>[] = [
		{
			value: 'vsync',
			label: 'VSync',
		},
		...CAPS.map(fps => ({
			value: fps,
			label: `${fps} FPS`,
		})),
	];
	// a browser never renders past the refresh rate
	if (app) options.push({
		value: 'unlimited',
		label: <Trans>Unlimited</Trans>,
	});
	return (
		<>
			<div className="opt-row">
				<span className="opt-row__label"><Trans>Frame limiter</Trans></span>
				<Dropdown value={SETTINGS.frameLimiter} options={options} />
			</div>
			{app && app.frameRate.uncapped !== wantsUncapped(limit) && (
				<div className="opt-row__hint"><Trans>Restart the game to apply</Trans></div>
			)}
		</>
	);
}
