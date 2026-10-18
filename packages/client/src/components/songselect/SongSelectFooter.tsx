import {
	useCallback,
	useEffect,
} from 'react';
import { Trans } from '@lingui/react/macro';
import useSynced from '@osu-idle/shared/hooks/useSynced';
import { rateLabel } from '@osu-idle/shared/rate';
import {
	selectedRate,
	stepRate,
} from '../../gameplay/playRate';
import { modSelectOpen } from '../mods/modSelectOpen';
import ModSelect from '../mods/ModSelect';

const RATE_KEYS: Record<string, 1 | -1> = {
	Minus: -1, Equal: 1,
};

/** osu!'s song select buttons next to Back: Mods (F1), Random (F2), Beatmap Options (F3). */
export default function SongSelectFooter({ onRandom, onOptions }: {
	onRandom: () => void,
	onOptions: () => void,
}) {
	const [rate] = useSynced(selectedRate);
	const [modsOpen] = useSynced(modSelectOpen);
	const onMods = useCallback(() => void modSelectOpen.set(!modSelectOpen.get()), []);
	useEffect(() => () => void modSelectOpen.set(false), []);

	useEffect(() => {
		const keys: Record<string, () => void> = {
			F1: onMods, F2: onRandom, F3: onOptions,
		};
		const onKey = (e: KeyboardEvent) => {
			// Ctrl and the two keys left of Backspace (azerty's ) and =): rate down / up
			const rate = e.ctrlKey && RATE_KEYS[e.code];
			if (rate) {
				e.preventDefault();
				stepRate(rate);
				return;
			}
			const action = keys[e.key];
			if (!action) return;
			e.preventDefault();
			action();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [onMods, onRandom, onOptions]);

	return (<>
		<div className="select-footer">
			<button type="button" className="select-footer__btn is-mods" onClick={onMods}>
				<Trans>Mods</Trans>
				{rate !== 1 && <span className="select-footer__active">{rateLabel(rate)}</span>}
				<span className="select-footer__key">F1</span>
			</button>
			<button type="button" className="select-footer__btn is-random" onClick={onRandom}>
				<Trans>Random</Trans>
				<span className="select-footer__key">F2</span>
			</button>
			<button type="button" className="select-footer__btn is-options" onClick={onOptions}>
				<Trans>Beatmap Options</Trans>
				<span className="select-footer__key">F3</span>
			</button>
		</div>
		{modsOpen && <ModSelect onClose={() => void modSelectOpen.set(false)} />}
	</>);
}
