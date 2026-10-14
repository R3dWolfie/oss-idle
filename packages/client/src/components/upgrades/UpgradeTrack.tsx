import type { CSSProperties } from 'react';
import { BASE_MAX_UPGRADES } from '@osu-idle/shared/upgrades';

/** Colours cycle past the fourth layer. */
const LAYERS = 4;

/** How many times slot `i` has been bought over: the ladder wraps like a boss
 *  hp bar, prestige slots starting a new layer from the left. */
const layerOf = (i: number, bought: number) =>
	bought > i ? Math.floor((bought - 1 - i) / BASE_MAX_UPGRADES) + 1 : 0;

const colour = (layer: number) => (layer > 0 ? `is-layer-${(layer - 1) % LAYERS + 1}` : '');

export default function UpgradeTrack({
	upgrades,
	max,
	maxed,
	ready,
	progress,
}: {
	upgrades: number,
	max: number,
	maxed: boolean,
	ready: boolean,
	progress: number,
}) {
	const next = upgrades % BASE_MAX_UPGRADES;
	const nextLayer = Math.floor(upgrades / BASE_MAX_UPGRADES) + 1;

	return (
		<div className="ladder-track">
			{Array.from({ length: Math.min(max, BASE_MAX_UPGRADES) }, (_, i) => {
				const isNext = !maxed && i === next;
				return (
					<span key={i} className={`ladder-track__slot ${colour(layerOf(i, upgrades))}`}>
						{isNext && (
							<span
								className={`ladder-track__next ${colour(nextLayer)} ${ready ? 'is-ready' : ''}`}
								style={{ '--fill': ready ? 1 : progress } as CSSProperties}
							/>
						)}
					</span>
				);
			})}
		</div>
	);
}
