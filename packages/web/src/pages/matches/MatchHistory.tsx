import './MatchHistory.css';
import { Trans } from '@lingui/react/macro';
import MatchGame from './MatchGame';
import MatchEventLine from './MatchEventLine';
import type {
	HistoryEvent,
	MatchHistoryData,
} from './types';

/** Runs of events between games, osu!-style: each run in its own box. */
const blocks = (events: HistoryEvent[]): HistoryEvent[][] => {
	const out: HistoryEvent[][] = [];
	for (const e of events) {
		const last = out[out.length - 1];
		if (e.game || !last || last[0].game) out.push([e]);
		else last.push(e);
	}
	return out;
};

/** A multiplayer match, osu!'s way: who came and went, and every game played. */
export default function MatchHistory({ match }: { match: MatchHistoryData }) {
	return (
		<main className='page-contents match'>
			<h1 className='match__name'>{match.name}</h1>
			{blocks(match.events).map(block => block[0].game
				? <MatchGame key={block[0].id} game={block[0].game} />
				: (
					<div key={block[0].id} className='match__events'>
						{block.map(e => <MatchEventLine key={e.id} event={e} />)}
					</div>
				))}
			{match.endedAt === undefined && (
				<div className='match__live'><Trans>match in progress</Trans></div>
			)}
		</main>
	);
}
