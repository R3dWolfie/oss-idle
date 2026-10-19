import type {
	CSSProperties,
	MouseEvent,
} from 'react';
import { Trans } from '@lingui/react/macro';
import { MEDAL_XP_BONUS } from '@oss-idle/shared/upgrades';
import { medalTierName } from '@oss-idle/shared/display/medals';
import type { MedalUnlock } from '../../achievements/medalUnlocks';
import MedalFace from './MedalFace';

type Props = {
	medal: MedalUnlock,
	bitmap?: string,
	onClose: () => void,
};

/** One medal brought to the front, with what it is and what it gives. */
export default function MedalFocus({ medal, bitmap, onClose }: Props) {
	const { look } = medal;
	const percent = +(MEDAL_XP_BONUS[look.tier] * 100).toFixed(2);
	const close = (e: MouseEvent) => {
		e.stopPropagation();
		onClose();
	};
	// the parallax tilts it around the middle of the screen
	const style = {
		'--tx': window.innerWidth / 2,
		'--ty': window.innerHeight * 0.4,
		'--bitmap': bitmap ? `url(${bitmap})` : undefined,
	} as CSSProperties;

	return <div className={`medal-focus tier-${look.tier}`} style={style} onClick={close}>
		<div className="medal-focus__medal">
			<div className="medal-tile__tilt">
				<div className="medal-tile__glow" />
				<MedalFace bitmap={bitmap} shine />
			</div>
		</div>
		<div className="medal-focus__text">
			<div className="medal-tile__tier">{medalTierName(look.tier)}</div>
			<div className="medal-focus__name">{medal.name}</div>
			<div className="medal-focus__description">{medal.description}</div>
			<div className="medal-tile__bonus"><Trans>+{percent}% XP</Trans></div>
		</div>
	</div>;
}
