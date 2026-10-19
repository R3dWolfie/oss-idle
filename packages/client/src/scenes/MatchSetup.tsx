import { ph } from '@lingui/core/macro';
import '../components/multiplayer/Multiplayer.css';
import { useEffect } from 'react';
import { Trans } from '@lingui/react/macro';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import useAsync from '@oss-idle/shared/hooks/useAsync';
import {
	matchPlayers,
	matchSize,
} from '@oss-idle/shared/multiplayer';
import Background from './Background';
import SceneManager, { SCENE } from './SceneManager';
import Controls from '../input/Controls';
import Entities from '../entity/entities';
import Multiplayer from '../online/multiplayer';
import {
	getCharacter,
	getCharacterStats,
} from '../online/services/characters';
import UserCard from '../components/songselect/UserCard';
import SlotRow from '../components/multiplayer/SlotRow';
import MatchSettings from '../components/multiplayer/MatchSettings';
import ReadyButton from '../components/multiplayer/ReadyButton';
import usePlayers from '../components/multiplayer/usePlayers';
import useMultiplayerChat from '../components/multiplayer/useMultiplayerChat';

/** osu!'s Match Setup: the seats, the map, and the host's settings. */
export default function MatchSetup() {
	const [match] = useSynced(Multiplayer.current);
	const [character] = useSynced(Entities.character);
	const players = usePlayers();
	useMultiplayerChat();

	const online_character = useAsync(async () => character.isGuest() ? undefined
		: getCharacter(character.id), [character]);
	const online_stats = useAsync(async () => character.isGuest() ? undefined
		: getCharacterStats(character.id), [character]);

	// kicked out, or the match went away
	useEffect(() => { if (!match) SceneManager.set(SCENE.LOBBY); }, [match]);

	const leave = () => {
		Multiplayer.leave();
		SceneManager.set(SCENE.LOBBY);
	};
	Controls.back.usePress(leave);

	if (!match) return null;
	const rank = players.get(character.id)?.rank;

	return (
		<div className="mp">
			<Background />
			<div className="mp__dim" />
			<header className="mp__top">
				<div className="mp__title">
					<Trans>Match Setup</Trans>
					<span className="mp__subtitle">
						{Multiplayer.isHost(match) ? <Trans>You are the host!</Trans> : <Trans>You are a player.</Trans>}
					</span>
				</div>
				<div className="mp__user">
					{rank !== undefined && <span className="mp__user-rank">#{rank}</span>}
					<UserCard character={character} online_character={online_character} online_stats={online_stats} />
				</div>
			</header>

			<div className="mp-setup">
				<div className="mp-setup__players">
					<h2 className="mp-setup__heading">
						<Trans>Current Players ({ph({ players: matchPlayers(match).length })}/{ph({ size: matchSize(match) })})</Trans>
					</h2>
					<div className="mp-setup__slots">
						{match.slots.map((slot, i) => (
							<SlotRow
								key={i}
								match={match}
								slot={slot}
								index={i}
								player={slot.state === 'player' ? players.get(slot.characterId) : undefined}
								me={character.id}
							/>
						))}
					</div>
				</div>
				<MatchSettings match={match} />
			</div>

			<div className="mp-actions">
				<button type="button" className="mp-action" onClick={leave}>
					<Trans>Leave Match</Trans>
				</button>
				<ReadyButton match={match} />
			</div>
		</div>
	);
}
