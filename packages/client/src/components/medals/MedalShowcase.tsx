import {
	useEffect,
	useMemo,
	useRef,
	useState,
	type RefObject,
} from 'react';
import { Trans } from '@lingui/react/macro';
import type { MedalTier } from '@osu-idle/shared/achievements/medal';
import { MEDAL_XP_BONUS } from '@osu-idle/shared/upgrades';
import { MEDALS } from '@osu-idle/shared/achievements/catalogue';
import type { MedalUnlock } from '../../achievements/medalUnlocks';
import {
	medalFinale,
	medalReveal,
	medalTick,
	medalWhoosh,
} from '../../audio/medalSounds';
import { medalSlots } from './medalLayout';
import { lookKey } from './medalBitmaps';
import MedalTile from './MedalTile';

/** wait before medal i+1 arrives, while they come one at a time */
const GAPS_MS = [1000, 750, 500];
/** then they pour in: this gap, shrinking by RAMP each time, down to FASTEST_MS */
const POUR_MS = 250;
const RAMP = 0.85;
const FASTEST_MS = 70;
/** the impact lands this long into a tile's entrance */
const LAND_MS = 200;
const TWINKLE_MS = 350;
const HEADER_PX = 130;
const FOOTER_PX = 70;
const SIDE_PX = 32;
const SLOW = GAPS_MS.length + 1;

const gapBefore = (i: number) => i < SLOW
	? GAPS_MS[i - 1] ?? 0
	: Math.max(FASTEST_MS, POUR_MS * Math.pow(RAMP, i - SLOW));

const bonusOf = (medals: MedalUnlock[]) =>
	medals.reduce((product, m) => product * (1 + MEDAL_XP_BONUS[m.look.tier]), 1);

const useViewport = () => {
	const [size, setSize] = useState({
		width: window.innerWidth, height: window.innerHeight,
	});
	useEffect(() => {
		const onResize = () => setSize({
			width: window.innerWidth, height: window.innerHeight,
		});
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	}, []);
	return size;
};

/** A medal's place in its wave: arrivals are paced and voiced per wave. */
type Place = { i: number, last: number };

/** Sound for the i-th arrival of a wave: a full reveal while they come slowly,
 *  a rising tick once they pour in. */
const arrivalSound = (tier: MedalTier, { i, last }: Place) => {
	if (i === 0) medalWhoosh();
	if (i < SLOW) setTimeout(() => medalReveal(tier), LAND_MS);
	else medalTick(i - SLOW, last + 1 - SLOW);
	if (i === last && i >= SLOW) medalFinale();
};

/** A random medal on a crowded stage catches the light now and then. */
const useTwinkle = (stage: RefObject<HTMLDivElement | null>) => useEffect(() => {
	const timer = setInterval(() => {
		const tiles = stage.current?.querySelectorAll('.medal-tile.is-shown.is-compact');
		if (!tiles?.length) return;
		const tile = tiles[Math.floor(Math.random() * tiles.length)];
		tile.classList.add('is-twinkle');
		tile.addEventListener('animationend', () => tile.classList.remove('is-twinkle'), { once: true });
	}, TWINKLE_MS);
	return () => clearInterval(timer);
}, [stage]);

type Props = {
	/** one per batch, each arriving after the one before */
	waves: MedalUnlock[][],
	/** medals the character holds once all of these are in */
	held: number,
	/** bitmaps by look; arrivals wait for them so none appears half-loaded */
	bitmaps?: Map<string, string>,
	/** the medals before this index appear at once, silently */
	skipTo: number,
	onArrived: (count: number) => void,
	onFocus: (medal: MedalUnlock) => void,
};

export default function MedalShowcase({
	waves, held, bitmaps, skipTo, onArrived, onFocus,
}: Props) {
	const medals = useMemo(() => waves.flat(), [waves]);
	const places = useMemo(
		() => waves.flatMap(w => w.map((_, i): Place => ({
			i, last: w.length - 1,
		}))),
		[waves],
	);
	const [arrived, setArrived] = useState(0);
	const viewport = useViewport();
	const stage = useRef<HTMLDivElement>(null);
	useTwinkle(stage);

	const shown = Math.min(medals.length, Math.max(arrived, skipTo));
	const next = medals[shown];
	const arriving = !!next && !!bitmaps?.has(lookKey(next.look));

	useEffect(() => {
		if (!arriving) return;
		const timer = setTimeout(() => {
			arrivalSound(medals[shown].look.tier, places[shown]);
			setArrived(shown + 1);
		}, gapBefore(places[shown].i));
		return () => clearTimeout(timer);
	}, [arriving, places, shown, medals]);

	useEffect(() => onArrived(shown), [onArrived, shown]);

	const width = viewport.width - SIDE_PX * 2;
	const height = viewport.height - HEADER_PX - FOOTER_PX;

	const slots = medalSlots(shown, width, height);
	// a medal not here yet waits where it will land, so arriving moves nothing
	const landing = useMemo(
		() => medals.map((_, i) => medalSlots(i + 1, width, height)[i]),
		[height, medals, width],
	);
	const visible = medals.slice(0, shown);
	const best = visible[visible.length - 1]?.look.tier ?? 'bronze';
	const percent = ((bonusOf(visible) - 1) * 100).toFixed(1);
	const origin = {
		x: SIDE_PX, y: HEADER_PX,
	};

	return <div className={`medal-showcase tier-${best}`}>
		<div className="medal-showcase__rays" />
		<div className="medal-showcase__header">
			<div className="medal-showcase__title">
				{medals.length > 1 ? <Trans>Medals unlocked</Trans> : <Trans>Medal unlocked</Trans>}
			</div>
			<div className="medal-showcase__count">{held - medals.length + shown} / {MEDALS.length}</div>
			<div className="medal-showcase__bonus"><Trans>+{percent}% XP</Trans></div>
		</div>
		<div ref={stage} className="medal-showcase__stage" style={{
			left: SIDE_PX, top: HEADER_PX, width, height,
		}}>
			{medals.map((medal, i) => <MedalTile
				key={medal.id}
				medal={medal}
				slot={i < shown ? slots[i] : landing[i]}
				origin={origin}
				index={i}
				shown={i < shown}
				celebrate={i >= skipTo && (places[i].i < SLOW || places[i].i === places[i].last)}
				bitmap={bitmaps?.get(lookKey(medal.look))}
				onFocus={onFocus}
			/>)}
		</div>
	</div>;
}
