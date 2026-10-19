import {
	compareGrade,
	type Grade as GradeName,
} from '@oss-idle/shared/judgement';
import Grade from './Grade';

const TOWER: GradeName[] = ['XX', 'X', 'SS', 'S', 'A', 'B', 'C', 'D'];

/** osu!web's grade tower: the score's grade lit, the ones above missed, below passed. */
export default function ScoreTower({ grade }: { grade: GradeName }) {
	return <div className='score-tower'>
		{TOWER.map(g => {
			const order = compareGrade(g, grade);
			const state = order < 0 ? 'missed' : order > 0 ? 'passed' : '';
			return <div key={g} className={`score-tower__item ${state && `score-tower__item--${state}`}`}>
				<Grade grade={g} />
			</div>;
		})}
	</div>;
}
