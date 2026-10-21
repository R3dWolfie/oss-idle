import { useEffect } from 'react';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import type { RoundScore } from '@oss-idle/shared/multiplayer';
import Multiplayer from '../../online/multiplayer';
import Socket from '../../online/socket';

/** The round's live standings, best first, streamed while `on`. */
export default function useLiveScores(on: boolean): RoundScore[] {
	const [scores = []] = useSynced(Multiplayer.scores);
	useEffect(() => {
		if (!on) return;
		void Multiplayer.scores.set([]);
		// the feed dies with the socket: re-arm it on reconnect
		const watch = (open: boolean) => {
			if (open) Multiplayer.send({
				type: 'mp:watch', on: true,
			});
		};
		void Socket.connected.sync(watch);
		return () => {
			Socket.connected.desync(watch);
			Multiplayer.send({
				type: 'mp:watch', on: false,
			});
		};
	}, [on]);
	return on ? [...scores].sort((a, b) => b.score - a.score) : [];
}
