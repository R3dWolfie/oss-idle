import { Trans } from '@lingui/react/macro';
import { desktop } from '@oss-idle/shared/desktop';
import { SETTINGS } from '../../db/settings';
import Dropdown from '../dropdown/Dropdown';

const SCALES = [2, 1.5, 1.25, 1.1, 1, 0.9, 0.75, 0.5];

export default function UIScaling() {
	const app = desktop();
	// CSS zoom can't stand in for browser zoom: viewport units don't follow it
	if (!app) return (
		<div className="opt-row__hint">
			<Trans>UI scaling: use your browser's zoom (Ctrl + / Ctrl -)</Trans>
		</div>
	);
	if (!app.setZoomFactor) return <></>;
	return (
		<div className="opt-row">
			<span className="opt-row__label"><Trans>UI scaling</Trans></span>
			<Dropdown
				value={SETTINGS.uiScale}
				options={SCALES.map(scale => ({
					value: scale,
					label: `${Math.round(scale * 100)}%`,
				}))}
			/>
		</div>
	);
}
