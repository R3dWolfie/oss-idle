import { useLingui } from '@lingui/react/macro';
import type { PresenceEntry } from '@oss-idle/shared/community/presence';
import { GUEST_AVATAR_URL } from '@oss-idle/shared/osu/profile';
import useSmoothNumber from '../../animations/useSmoothNumber';
import { linear } from '../../animations/smoothNumber';

/** standings arrive once a second: the score ticks up steadily between them */
const SCORE_GLIDE = {
	duration: 1000, easing: linear,
};

/** One player in osu!'s multiplayer scoreboard: in game, and the ranking tabs after. */
export default function MatchScoreCard({ player, score, combo, position, failed, self, onClick }: {
	player?: PresenceEntry,
	score: number,
	combo: number,
	position: number,
	failed: boolean,
	self: boolean,
	onClick?: () => void,
}) {
	const { i18n } = useLingui();
	const shown = useSmoothNumber(score, SCORE_GLIDE);
	return (
		<button
			type="button"
			className={`mp-score ${self ? 'is-self' : ''} ${failed ? 'is-failed' : ''}`}
			onClick={onClick}
			disabled={!onClick}
		>
			<img className="mp-score__avatar" src={player?.avatarUrl ?? GUEST_AVATAR_URL} alt="" />
			<span className="mp-score__main">
				<span className="mp-score__name">{player?.name ?? '...'}</span>
				<span className="mp-score__line">
					<span>{Math.round(shown).toLocaleString(i18n.locale)}</span>
					<span className="mp-score__combo">{combo}x</span>
				</span>
			</span>
			<span className="mp-score__position">{position}</span>
		</button>
	);
}
