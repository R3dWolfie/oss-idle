import type { getMatch } from '../../api/matches';

export type MatchHistoryData = Awaited<ReturnType<typeof getMatch>>;
export type HistoryEvent = MatchHistoryData['events'][number];
export type HistoryGame = NonNullable<HistoryEvent['game']>;
export type HistoryScore = HistoryGame['scores'][number];
export type HistoryPlayer = NonNullable<HistoryEvent['player']>;
