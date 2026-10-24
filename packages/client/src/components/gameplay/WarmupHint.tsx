import {
	useEffect,
	useState,
} from 'react';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import { ph } from '@lingui/core/macro';
import HoverCard from '@oss-idle/shared/display/HoverCard';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import { skillName } from '@oss-idle/shared/display/skills';
import { PHYSICAL_SKILLS } from '@oss-idle/shared/skills';
import { scoreboardEdge } from '../multiplayer/scoreboardEdge';
import { warmupGaugeBox } from '../../gameplay/render/hud';
import { warmupStage } from '../../gameplay/warmupStage';

const windowSize = () => ({
	w: innerWidth,
	h: innerHeight,
});

/** What the warm-up gauge means, on hover over the gauge the canvas draws. */
export default function WarmupHint({
	warmup,
	cooling,
}: {
	warmup: number,
	cooling: boolean | undefined,
}) {
	const { t } = useLingui();
	const [edge] = useSynced(scoreboardEdge);
	const [vp, setVp] = useState(windowSize);

	useEffect(() => {
		const resize = () => setVp(windowSize());
		addEventListener('resize', resize);
		return () => removeEventListener('resize', resize);
	}, []);

	const skills = PHYSICAL_SKILLS.map(skillName).join(', ');
	const now = {
		cold: t`Play physically demanding maps to warm up.`,
		warming: t`Keep playing physically demanding maps to reach your peak.`,
		warm: t`Almost at your peak.`,
		peak: t`Your physical skills are at their best.`,
		pushing: t`You are past your peak. Play easier maps to stay in optimal shape.`,
		tired: t`You are tiring and your physical skills are slipping.`,
	}[warmupStage(warmup, cooling)];

	return (
		<div className="play__warmup-hint" style={warmupGaugeBox(vp, edge ? edge + 16 : undefined)}>
			<HoverCard card={
				<span className="play__warmup-tip">
					<span>
						<Trans>
							Physical skills ({ph({ skills })}) need some warmup to reach their peak.
							You still gain full XP independently of warmup.
						</Trans>
					</span>
					<span>
						<Trans>
							You warm up by playing physically demanding maps. If you do this for too long though,
							you get tired and need to cool down in order to reach your peak again.
							Balance it out properly and you'll always play at your maximum skill level.
						</Trans>
					</span>
					<span className="play__warmup-tip-now">{now}</span>
					<span>
						<Trans>
							Fatigue only kicks in if you keep pushing after getting tired, and reduces XP gains.
						</Trans>
					</span>
				</span>
			}>
				<span className="play__warmup-hint-area" />
			</HoverCard>
		</div>
	);
}
