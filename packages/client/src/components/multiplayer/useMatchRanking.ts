import useSynced from '@osu-idle/shared/hooks/useSynced';
import type { ScoreDTO } from '@osu-idle/shared/score';
import type {
	LastRound,
	RoundScore,
} from '@osu-idle/shared/multiplayer';
import Multiplayer from '../../online/multiplayer';
import { getLatestScore } from '../../online/services/scores';
import SceneManager, { SCENE } from '../../scenes/SceneManager';
import useLiveScores from './useLiveScores';

type Played = Pick<ScoreDTO, 'beatmapId' | 'characterId' | 'playedAt'>;

export type Ranking = {
	results: RoundScore[],
	/** the round is over: these are the final standings */
	final: boolean,
	/** the score being shown */
	viewed: number,
	/** open a player's score, once the round is over */
	view: (characterId: number) => void,
};

/** Whether a score is one of the last round's, the one the ranking is about. */
const ofRound = (score: Played, round: LastRound | undefined): round is LastRound =>
	!!round && round.beatmapId === score.beatmapId && score.playedAt >= round.startedAt
	&& round.results.some(r => r.characterId === score.characterId);

/** The match's standings for a result screen: live while others still play, then
 *  final. Undefined when the score isn't a match play. */
export default function useMatchRanking(score: Played): Ranking | undefined {
	const [match] = useSynced(Multiplayer.current);
	const live = !!match && Multiplayer.inRound(match, score.beatmapId);
	const liveScores = useLiveScores(live);
	const round = match?.lastRound;
	const final = !live && ofRound(score, round);
	if (!live && !final) return undefined;

	const view = async (characterId: number) => {
		if (!final) return;
		const theirs = await getLatestScore(characterId, round.beatmapId);
		if (theirs && theirs.playedAt >= round.startedAt) SceneManager.set(SCENE.RESULT, theirs);
	};
	return {
		results: final ? round.results : liveScores,
		final,
		viewed: score.characterId,
		view: id => void view(id),
	};
}
