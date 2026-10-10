import { ph } from '@lingui/core/macro';
import '../components/multiplayer/Multiplayer.css';
import {
	useEffect,
	useState,
} from 'react';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import useSynced from '@osu-idle/shared/hooks/useSynced';
import useAsync from '@osu-idle/shared/hooks/useAsync';
import {
	matchPlayers,
	type Match,
} from '@osu-idle/shared/multiplayer';
import Background from './Background';
import SceneManager, { SCENE } from './SceneManager';
import Controls from '../input/Controls';
import Checkbox from '../components/options/controls/Checkbox';
import MusicControls from '../components/community/MusicControls';
import MatchRow from '../components/multiplayer/MatchRow';
import CreateMatch from '../components/multiplayer/CreateMatch';
import PasswordPrompt from '../components/multiplayer/PasswordPrompt';
import usePlayers from '../components/multiplayer/usePlayers';
import useMultiplayerChat from '../components/multiplayer/useMultiplayerChat';
import Multiplayer from '../online/multiplayer';
import { friends } from '../online/friends';
import { Setting } from '../db/settings';
import BeatmapStore, { beatmapsVersion } from '../osu/beatmap/beatmap_store';

const owned = new Setting('lobby.owned', false);
const withFriends = new Setting('lobby.friends', false);
const showFull = new Setting('lobby.full', true);
const showLocked = new Setting('lobby.locked', true);
const showInProgress = new Setting('lobby.inProgress', true);

/** osu!'s multiplayer lobby: the open matches, filtered. */
export default function Lobby() {
	const { t } = useLingui();
	const [matches = []] = useSynced(Multiplayer.matches);
	const [ownedOnly] = useSynced(owned);
	const [friendsOnly] = useSynced(withFriends);
	const [full] = useSynced(showFull);
	const [locked] = useSynced(showLocked);
	const [inProgress] = useSynced(showInProgress);
	const [friendIds = new Set<number>()] = useSynced(friends);
	const [library] = useSynced(beatmapsVersion);
	const [search, setSearch] = useState('');
	const [creating, setCreating] = useState(false);
	const [asking, setAsking] = useState<{ match: Match, wrong: boolean }>();
	const players = usePlayers();
	useMultiplayerChat();

	const ownedIds = useAsync(async () => new Set((await BeatmapStore.getAllSets())
		.flatMap(s => s.beatmaps.map(b => b.metadata.id))), [library]);

	useEffect(() => {
		Multiplayer.send({ type: 'mp:list' });
		Multiplayer.joinLobbyChat();
	}, []);

	const toMenu = () => {
		Multiplayer.leaveLobbyChat();
		SceneManager.set(SCENE.MENU);
	};

	const back = () => {
		if (asking) setAsking(undefined);
		else if (creating) setCreating(false);
		else toMenu();
	};
	Controls.back.usePress(back);

	const query = search.trim().toLowerCase();
	const shown = matches
		.filter(m => full || matchPlayers(m).length < m.slots.filter(s => s.state !== 'locked').length)
		.filter(m => locked || !m.locked)
		.filter(m => inProgress || !m.playing)
		.filter(m => !ownedOnly || (m.beatmap && ownedIds?.has(m.beatmap.id)))
		.filter(m => !friendsOnly || matchPlayers(m)
			.some(s => friendIds.has(players.get(s.characterId)?.userId ?? -1)))
		.filter(m => !query || `${m.name} ${m.beatmap?.artist} ${m.beatmap?.title} ${m.beatmap?.version}`
			.toLowerCase().includes(query))
		.sort((a, b) => a.id - b.id);

	const join = async (match: Match, password = '') => {
		if (match.locked && !asking) {
			setAsking({
				match, wrong: false,
			});
			return;
		}
		const reason = await Multiplayer.join(match.id, password);
		if (reason === 'password') {
			setAsking({
				match, wrong: true,
			});
			return;
		}
		setAsking(undefined);
		if (!reason) SceneManager.set(SCENE.MATCH);
	};

	const quickJoin = () => {
		const open = shown.find(m => !m.locked && !m.playing
			&& m.slots.some(s => s.state === 'open'));
		if (open) void join(open);
	};

	return (
		<div className="mp">
			<Background />
			<div className="mp__dim" />
			<header className="mp__top">
				<div className="mp__title">
					<Trans>Multiplayer Lobby</Trans>
					<span className="mp__subtitle">
						<Trans>Showing {ph({ shown: shown.length })} of {ph({ total: matches.length })} matches</Trans>
					</span>
				</div>
				<MusicControls />
			</header>


			<div className="mp-filters">
				<Checkbox value={owned} label={<Trans>Owned Beatmaps</Trans>} />
				<Checkbox value={showFull} label={<Trans>Show Full</Trans>} />
				<label className="mp-filters__search">
					<Trans>Search:</Trans>
					<input className="mp-input" value={search} onChange={e => setSearch(e.target.value)} />
				</label>
				<Checkbox value={withFriends} label={<Trans>Games with Friends</Trans>} />
				<Checkbox value={showLocked} label={<Trans>Show Locked</Trans>} />
				<Checkbox value={showInProgress} label={<Trans>Show In-Progress</Trans>} />
			</div>

			<div className="mp-list">
				{shown.map(m => <MatchRow key={m.id} match={m} players={players} onClick={() => void join(m)} />)}
				{!shown.length && (
					<div className="mp-list__empty">
						<Trans>There are no matches available.</Trans>
						<br />
						<Trans>Click 'New Game' to start a new game!</Trans>
					</div>
				)}
			</div>

			<div className="mp-actions">
				<button type="button" className="mp-action" onClick={toMenu}>
					<Trans>Back to Menu</Trans>
				</button>
				<button type="button" className="mp-action is-blue" onClick={() => setCreating(true)}>
					<Trans>New Game</Trans>
				</button>
				<button type="button" className="mp-action" onClick={quickJoin}>
					<Trans>Quick Join</Trans>
				</button>
			</div>

			{creating && <CreateMatch onClose={() => setCreating(false)} />}
			{asking && <PasswordPrompt
				title={t`Joining this game requires a password...`}
				sub={asking.wrong ? t`Incorrect password.` : undefined}
				confirmLabel={t`Join Game`}
				onSubmit={password => void join(asking.match, password)}
				onClose={() => setAsking(undefined)}
			/>}
		</div>
	);
}
