import {
	useCallback,
	useRef,
} from 'react';
import useSynced from '@osu-idle/shared/hooks/useSynced';
import { scoreboardEdge } from './scoreboardEdge';
import Multiplayer from '../../online/multiplayer';
import Entities from '../../entity/entities';
import MatchScoreCard from './MatchScoreCard';
import usePlayers from './usePlayers';
import useLiveScores from './useLiveScores';

/** The live standings on the left of the playfield, during a match play. */
export default function MatchScoreboard({ beatmapId }: { beatmapId: number }) {
	const [match] = useSynced(Multiplayer.current);
	const players = usePlayers();
	const inRound = !!match && Multiplayer.inRound(match, beatmapId);
	const scores = useLiveScores(inRound);
	const observer = useRef<ResizeObserver>();

	// the strain meters move past it (its width follows the window); they go
	// back to the edge once it's gone
	const measure = useCallback((el: HTMLDivElement | null) => {
		observer.current?.disconnect();
		if (!el) {
			void scoreboardEdge.set(0);
			return;
		}
		observer.current = new ResizeObserver(() => {
			void scoreboardEdge.set(el.getBoundingClientRect().right);
		});
		observer.current.observe(el);
	}, []);

	if (!inRound) return null;
	const me = Entities.character.get()?.id;
	return (
		<div className="mp-scoreboard" ref={measure}>
			{scores.map((s, i) => (
				<MatchScoreCard
					key={s.characterId}
					player={players.get(s.characterId)}
					score={s.score}
					combo={s.combo}
					position={i + 1}
					failed={s.failed}
					self={s.characterId === me}
				/>
			))}
		</div>
	);
}
