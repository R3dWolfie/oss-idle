import './ModSelect.css';
import '../ContextMenu.css';
import { useEffect } from 'react';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import useSynced from '@osu-idle/shared/hooks/useSynced';
import {
	MAX_RATE,
	MIN_RATE,
	RATE_STEP,
	rateSteps,
	scoreMultiplier,
} from '@osu-idle/shared/rate';
import Entities from '../../entity/entities';
import { SETTINGS } from '../../db/settings';
import { inTextBox } from '../../input/Controls';
import {
	pickRate,
	selectedRate,
	speedUpgrades,
} from '../../gameplay/playRate';
import ModTile from './ModTile';
import RateStepper from './RateStepper';

const sideSteps = (from: number, to: number): number[] => {
	const steps: number[] = [];
	const count = Math.round(Math.abs(to - from) / RATE_STEP);
	const direction = Math.sign(to - from);
	for (let i = 0; i <= count; i++) {
		steps.push(Math.round((from + direction * i * RATE_STEP) * 100) / 100);
	}
	return steps;
};
const SLOWER = sideSteps(1 - RATE_STEP, MIN_RATE);
const FASTER = sideSteps(1 + RATE_STEP, MAX_RATE);

/** osu!'s mod select over song select. Only the rate mods exist so far. */
export default function ModSelect({ onClose }: { onClose: () => void }) {
	const { t } = useLingui();
	const [rate] = useSynced(selectedRate);
	const [character] = useSynced(Entities.character);
	const unlocked = rateSteps(speedUpgrades(character));
	const none = unlocked.length === 1;
	const pick = pickRate;
	// on: the last rate picked on that side; off: back to x1
	const toggle = (side: number[]) => pick(side.includes(rate)
		? 1
		: (side === FASTER ? SETTINGS.fasterRate : SETTINGS.slowerRate).get());
	// the wheel over a lit mod steps along its side, never across x1
	const wheel = (side: number[]) => (e: React.WheelEvent) => {
		const next = Math.round((rate + (e.deltaY < 0 ? 1 : -1) * RATE_STEP) * 100) / 100;
		if (side.includes(rate) && side.includes(next)) pick(next);
	};

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (inTextBox(e.target)) return;
			// F1 is the footer's toggle
			if (e.key === '1') pick(1);
			else if (e.key === '2') onClose();
			else return;
			e.preventDefault();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [onClose]);

	const locked = none ? t`Upgrade Speed to unlock rates` : undefined;
	return (
		<div className="mod-select" onClick={onClose}>
			<div className="mod-select__panel" onClick={e => e.stopPropagation()}>
				<p className="mod-select__intro">
					<Trans>
						Mods change how a map plays. A faster rate usually makes the map harder,
						and a slower one easier.
					</Trans>
				</p>
				<div className="mod-select__multiplier">
					<Trans>Score Multiplier: {scoreMultiplier(rate).toFixed(2)}x</Trans>
				</div>

				<div className="mod-select__row">
					<div className="mod-select__heading is-reduction"><Trans>Difficulty Reduction</Trans></div>
					<div className="mod-select__mods">
						<div className="mod-select__mod" onWheel={wheel(SLOWER)}>
							<ModTile
								glyph="hourglass" label={t`Half`} tint="#5b5b66"
								on={rate < 1} disabled={none} title={locked} onClick={() => toggle(SLOWER)}
							/>
							{rate < 1 && <RateStepper steps={SLOWER} unlocked={unlocked} current={rate} onPick={pick} />}
						</div>
					</div>
				</div>

				<div className="mod-select__row">
					<div className="mod-select__heading is-increase"><Trans>Difficulty Increase</Trans></div>
					<div className="mod-select__mods">
						<div className="mod-select__mod" onWheel={wheel(FASTER)}>
							<ModTile
								glyph="clock" label={t`Double`} tint="#8c4fd0"
								on={rate > 1} disabled={none} title={locked} onClick={() => toggle(FASTER)}
							/>
							{rate > 1 && <RateStepper steps={FASTER} unlocked={unlocked} current={rate} onPick={pick} />}
						</div>
					</div>
				</div>

				<div className="ctxmenu__options">
					<button
						type="button" className="ctxmenu__option" style={{ '--accent': '#e93100' } as React.CSSProperties}
						onClick={() => pick(1)}
					>
						<Trans>1. Reset All Mods</Trans>
					</button>
					<button
						type="button" className="ctxmenu__option" style={{ '--accent': '#6b6b6b' } as React.CSSProperties}
						onClick={onClose}
					>
						<Trans>2. Close</Trans>
					</button>
				</div>
			</div>
		</div>
	);
}
