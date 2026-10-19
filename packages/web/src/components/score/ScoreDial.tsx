import {
	arc,
	pie,
} from 'd3-shape';
import type { Grade as GradeName } from '@oss-idle/shared/judgement';
import Grade from './Grade';

// osu!web's mania cutoffs, D to SS clockwise; SS from 0.99 so its slice shows
const CUTOFFS = [0, 0.7, 0.8, 0.9, 0.95, 0.99, 1];
const SLICES = CUTOFFS.slice(1).map((c, i) => c - CUTOFFS[i]);

const ring = arc();
const slices = pie().sortValues(null);

/** osu!web's score dial: the accuracy ring over the grade cutoffs, the grade inside. */
export default function ScoreDial({ accuracy, grade }: { accuracy: number; grade: GradeName }) {
	return <div className='score-dial'>
		<svg viewBox='0 0 200 200'>
			<defs>
				<linearGradient gradientTransform='rotate(90)' id='dial-outer'>
					<stop className='score-dial__outer-start' offset='0%' />
					<stop className='score-dial__outer-end' offset='100%' />
				</linearGradient>
			</defs>
			<g transform='translate(100, 100)'>
				{slices(SLICES).map(d => <path
					key={d.index}
					className={`score-dial__inner score-dial__inner--${d.index}`}
					d={ring({
						innerRadius: 68, outerRadius: 73, ...d, 
					}) ?? undefined}
				/>)}
				{slices([accuracy, 1 - accuracy]).map(d => <path
					key={d.index}
					className={`score-dial__outer score-dial__outer--${d.index}`}
					d={ring({
						innerRadius: 75, outerRadius: 100, ...d, 
					}) ?? undefined}
				/>)}
			</g>
		</svg>
		<div className='score-dial__grade'><Grade grade={grade} /></div>
	</div>;
}
