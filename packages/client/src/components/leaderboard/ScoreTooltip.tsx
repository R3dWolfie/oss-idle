import { ph } from '@lingui/core/macro';
import './ScoreTooltip.css';
import { createPortal } from 'react-dom';
import { ScoreDTO } from '@oss-idle/shared/score';
import { Trans } from '@lingui/react/macro';
import {
	JUDGEMENT,
	Judgement,
	Judgements,
} from '@oss-idle/shared/judgement';
import { showsDivine } from '@oss-idle/shared/rebirth';
import accuracyText from '@oss-idle/shared/display/accuracy';
import { currentSkin } from '../../osu/skin/Skin';
import { Score } from '../../db/schema/score';
import { dateAgo } from '@oss-idle/shared/display/ago';
import useSynced from '@oss-idle/shared/hooks/useSynced';

interface Props {
	score: Score | ScoreDTO,
	x: number,
	y: number,
}

/** Small info card that follows the mouse while a score row is hovered.
 * Rendered in a body portal so it escapes the leaderboard's scroll clipping.
 * The `score` is in scope here : fill in the content to taste. */
export default function ScoreTooltip({ score, x, y }: Props) {
	const [skin] = useSynced(currentSkin);
	const date = new Date(score.playedAt).toLocaleString();
	const accuracy = accuracyText(score.accuracy);

	const getJudge = (
		j: Judgement, 
		score: Score | ScoreDTO,
	) => 'judgements' in score ? score.judgements[j] : score[j];

	return createPortal(
		<div className="score_tooltip" style={{
			left: x, top: y, 
		}}>
			<Trans>Achieved on {date} ({ph({ ago: dateAgo(score.playedAt) })})</Trans><br />
			{Judgements
				.filter(j => j !== JUDGEMENT.DIVINE || showsDivine(getJudge(j, score) ?? 0))
				.map(j => (
					<span key={j}>
						<span style={{ color: skin.data.judgements[j].judge }}>
							{skin.data.judgements[j].text}
						</span>: {getJudge(j, score)}&nbsp;
					</span>
				))}<br />
			<Trans>Accuracy: {accuracy}</Trans>
		</div>,
		document.body,
	);
}
