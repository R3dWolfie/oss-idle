import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import PlayerName from './PlayerName';
import type { HistoryEvent } from './types';

/** osu!'s little mark before each kind of event. */
const ICONS: Record<HistoryEvent['type'], { glyph: string, tone: string }> = {
	create: {
		glyph: '+', tone: 'good',
	},
	join: {
		glyph: '→○', tone: 'good',
	},
	host: {
		glyph: '⇄', tone: 'good',
	},
	leave: {
		glyph: '←○', tone: 'bad',
	},
	kick: {
		glyph: '←○', tone: 'bad',
	},
	close: {
		glyph: '✕', tone: 'bad',
	},
	game: {
		glyph: '', tone: 'good',
	},
};

/** One line of a match's history: who came, went, or took the host. */
export default function MatchEventLine({ event }: { event: HistoryEvent }) {
	const { i18n } = useLingui();
	const who = event.player ? <PlayerName player={event.player} /> : <Trans>a player</Trans>;
	const text = {
		create: <Trans>{who} created the match</Trans>,
		join: <Trans>{who} joined the match</Trans>,
		leave: <Trans>{who} left the match</Trans>,
		kick: <Trans>{who} has been kicked from the match</Trans>,
		host: <Trans>{who} became the host</Trans>,
		close: <Trans>the match was disbanded</Trans>,
		game: null,
	}[event.type];
	const icon = ICONS[event.type];

	return (
		<div className='match__event'>
			<span className='match__time'>{new Date(event.at).toLocaleTimeString(i18n.locale)}</span>
			<span className={`match__icon is-${icon.tone}`}>{icon.glyph}</span>
			<span>{text}</span>
		</div>
	);
}
