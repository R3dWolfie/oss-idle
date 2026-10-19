import type { PresenceEntry } from '@oss-idle/shared/community/presence';
import type {
	Match,
	MatchSlot,
} from '@oss-idle/shared/multiplayer';
import type { GlyphName } from '@oss-idle/shared/achievements/glyphs';
import Glyph from './Glyph';
import SlotLabel from './SlotLabel';
import Multiplayer from '../../online/multiplayer';
import { menuFor } from '../community/state';

const status = (slot: MatchSlot): string => {
	if (slot.state !== 'player') return slot.state;
	if (slot.playing) return 'playing';
	if (slot.noMap) return 'no-map';
	return slot.ready ? 'ready' : 'not-ready';
};

const lockGlyph = (slot: MatchSlot, isHost: boolean): GlyphName => {
	if (isHost) return 'crown';
	return slot.state === 'locked' ? 'lock' : 'lockOpen';
};

/** One of the 16 seats on the match setup screen. */
export default function SlotRow({ match, slot, index, player, me }: {
	match: Match,
	slot: MatchSlot,
	index: number,
	player?: PresenceEntry,
	me?: number,
}) {
	const host = Multiplayer.isHost(match);
	const self = slot.state === 'player' && slot.characterId === me;
	const isHostSlot = slot.state === 'player' && slot.characterId === match.hostId;

	const lock = () => {
		if (host && slot.state !== 'player') Multiplayer.send({
			type: 'mp:lock', slot: index,
		});
	};
	// an open seat: sit there; a player: osu!'s player menu
	const click = () => {
		if (slot.state === 'open') Multiplayer.send({
			type: 'mp:slot', slot: index,
		});
		else if (player) void menuFor.set(player);
	};

	return (
		<div className={`mp-slot is-${status(slot)} ${self ? 'is-self' : ''}`}>
			<button
				type="button"
				className="mp-slot__lock"
				onClick={lock}
				disabled={!host || slot.state === 'player'}
			>
				<Glyph name={lockGlyph(slot, isHostSlot)} />
			</button>
			<span className="mp-slot__bar" />
			<button
				type="button"
				className="mp-slot__name"
				onClick={click}
				disabled={slot.state === 'locked'}
			>
				<SlotLabel slot={slot} player={player} />
			</button>
		</div>
	);
}
