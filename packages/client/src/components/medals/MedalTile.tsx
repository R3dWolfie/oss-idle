import {
	useEffect,
	useState,
	type CSSProperties,
	type MouseEvent,
} from 'react';
import { Trans } from '@lingui/react/macro';
import { MEDAL_XP_BONUS } from '@osu-idle/shared/upgrades';
import { medalTierName } from '@osu-idle/shared/display/medals';
import type { MedalUnlock } from '../../achievements/medalUnlocks';
import type { MedalSlot } from './medalLayout';
import MedalBurst from './MedalBurst';
import MedalFace from './MedalFace';

/** px of the unscaled tile; the slot scales it */
export const TILE_SIZE = 320;
const MAX_SCALE = 1.6;
/** below these cell sizes (px) the tile thins out */
const DETAIL_MIN = 190;
const LABEL_MIN = 120;
const FLIP_MS = 450;

type Props = {
	medal: MedalUnlock,
	slot: MedalSlot,
	/** where the stage sits on screen, for the cursor parallax */
	origin: { x: number, y: number },
	/** its place in the batch, staggering the idle animations */
	index: number,
	/** arrived (tiles are mounted hidden up front so arriving costs nothing) */
	shown: boolean,
	/** a big arrival: flash ring and particles */
	celebrate: boolean,
	bitmap?: string,
	onFocus: (medal: MedalUnlock) => void,
};

export default function MedalTile({
	medal, slot, origin, index, shown, celebrate, bitmap, onFocus,
}: Props) {
	const { look } = medal;
	const [revealed, setRevealed] = useState(!medal.secret);

	useEffect(() => {
		if (revealed || !shown) return;
		const timer = setTimeout(() => setRevealed(true), FLIP_MS);
		return () => clearTimeout(timer);
	}, [revealed, shown]);

	const scale = Math.min(MAX_SCALE, slot.size / TILE_SIZE);
	const compact = slot.size < DETAIL_MIN;
	const x = slot.x - TILE_SIZE / 2;
	const y = slot.y - TILE_SIZE / 2;
	const style = {
		transform: `translate(${x}px, ${y}px) scale(${scale})`,
		'--tx': origin.x + slot.x,
		'--ty': origin.y + slot.y,
		'--i': index,
		'--bitmap': bitmap ? `url(${bitmap})` : undefined,
	} as CSSProperties;
	const percent = +(MEDAL_XP_BONUS[look.tier] * 100).toFixed(2);
	const focus = (e: MouseEvent) => {
		if (!shown) return;
		e.stopPropagation();
		onFocus(medal);
	};

	return <div
		className={[
			'medal-tile',
			`tier-${look.tier}`,
			shown ? 'is-shown' : '',
			revealed ? 'is-revealed' : '',
			medal.secret ? 'is-secret' : '',
			compact ? 'is-compact' : '',
			slot.size < LABEL_MIN ? 'is-bare' : '',
		].join(' ')}
		style={style}
		onClick={focus}
	>
		<div className="medal-tile__body">
			<div className="medal-tile__tilt">
				{!compact && <div className="medal-tile__glow" />}
				<MedalFace bitmap={bitmap} shine={!compact} secret={medal.secret} />
			</div>
			{shown && celebrate && revealed && <>
				<div className="medal-tile__ring" />
				<MedalBurst />
			</>}
		</div>
		<div className="medal-tile__text">
			<div className="medal-tile__tier">{medalTierName(look.tier)}</div>
			<div className="medal-tile__name">{medal.name}</div>
			<div className="medal-tile__description">{medal.description}</div>
			<div className="medal-tile__bonus"><Trans>+{percent}% XP</Trans></div>
		</div>
	</div>;
}
