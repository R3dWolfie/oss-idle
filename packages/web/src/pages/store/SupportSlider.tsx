import { Trans } from '@lingui/react/macro';
import { ph } from '@lingui/core/macro';
import {
	MAX_SUPPORT,
	MIN_SUPPORT,
	SUPPORT_PRESETS,
	supporterMonths,
	supporterPrice,
	supporterSaving,
} from '@oss-idle/shared/supporter';
import SupportDuration from './SupportDuration';
import { euros } from './euros';

/** Picks an amount; the months follow it. */
type Props = {
	amount: number;
	onChange: (amount: number) => void;
};

export default function SupportSlider({ amount, onChange }: Props) {
	const months = supporterMonths(amount);
	const at = (amount - MIN_SUPPORT) / (MAX_SUPPORT - MIN_SUPPORT);

	return <div className='store__slider'>
		<div className='store__slider-track'>
			<div className='store__slider-tip' style={{ left: `${at * 100}%` }}>
				<div className='store__slider-price'>{euros(amount * 100)}</div>
				<div><SupportDuration months={months} /></div>
				<div><Trans>save {ph({ saving: Math.round(supporterSaving(amount) * 100) })}%</Trans></div>
			</div>
			<input
				type='range'
				min={MIN_SUPPORT}
				max={MAX_SUPPORT}
				value={amount}
				onChange={e => onChange(Number(e.target.value))}
				style={{ '--at': `${at * 100}%` } as React.CSSProperties}
			/>
		</div>
		<div className='store__presets'>
			<span><Trans>months</Trans></span>
			{SUPPORT_PRESETS.map(m => <button
				key={m}
				type='button'
				className={`store__preset ${months >= m ? 'active' : ''}`}
				onClick={() => onChange(supporterPrice(m))}
			>{m}</button>)}
		</div>
	</div>;
}
