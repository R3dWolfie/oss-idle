import { useLingui } from '@lingui/react/macro';
import { rateLabel } from '@osu-idle/shared/rate';
import Glyph from '../multiplayer/Glyph';

/** The mods a score was played with, beside its grade as on osu!'s ranking screen. */
export default function ResultMods({ rate }: { rate: number }) {
	const { t } = useLingui();
	if (rate === 1) return null;
	const double = rate > 1;
	return (
		<div className="result__mods">
			<div className="result__mod" data-side={double ? 'double' : 'half'}>
				<Glyph name={double ? 'clock' : 'hourglass'} className="result__mod-glyph" />
				<span>{double ? t`Double` : t`Half`}</span>
				<span>{rateLabel(rate)}</span>
			</div>
		</div>
	);
}
