import './PlayerMenu.css';
import { useLingui } from '@lingui/react/macro';
import useSynced from '@osu-idle/shared/hooks/useSynced';
import Log from '@osu-idle/shared/helpers/log';
import ContextMenu, { type ContextMenuOption } from '../ContextMenu';
import PlayerCard from './PlayerCard';
import { menuFor } from './state';
import Auth from '../../online/auth';
import {
	addFriend,
	friends,
	removeFriend,
} from '../../online/friends';
import {
	isWebOpen,
	webUrl,
} from '../../globals';
import { openConversation } from '../../online/privateMessages';
import Multiplayer from '../../online/multiplayer';

/** What the host of our match can do to another player in it. */
const hostActions = (
	characterId: number,
	close: () => void,
	labels: { give: string, kick: string },
): ContextMenuOption[] => {
	const match = Multiplayer.current.get();
	const seated = match?.slots.some(s => s.state === 'player' && s.characterId === characterId);
	if (!match || !seated || !Multiplayer.isHost(match) || characterId === match.hostId) return [];
	return [
		{
			label: labels.give,
			color: '#d9a400',
			onClick: () => {
				close();
				Multiplayer.send({
					type: 'mp:host', characterId,
				});
			},
		},
		{
			label: labels.kick,
			color: '#e93100',
			onClick: () => {
				close();
				Multiplayer.send({
					type: 'mp:kick', characterId,
				});
			},
		},
	];
};

/** osu!'s interaction menu for a clicked roster card. */
export default function PlayerMenu() {
	const { t } = useLingui();
	const [player] = useSynced(menuFor);
	const [user] = useSynced(Auth.user);
	const [friendIds = new Set<number>()] = useSynced(friends);
	if (!player) return null;

	const close = () => void menuFor.set(undefined);
	const isSelf = user?.id === player.userId;
	const isFriend = friendIds.has(player.userId);

	const toggleFriend = async () => {
		close();
		try {
			if (isFriend) await removeFriend(player.userId);
			else await addFriend(player.userId);
		} catch (e) {
			Log.errorPopup(String(e));
		}
	};

	const options: ContextMenuOption[] = [
		{
			label: t`View Profile`,
			color: '#2f5f9a',
			onClick: () => {
				close();
				void webUrl.set(`c/${player.characterId}`);
				void isWebOpen.set(true);
			},
		},
		...isSelf ? [] : [
			{
				label: t`Start Chat`,
				color: '#7d5cc6',
				onClick: () => {
					close();
					void openConversation(player.userId, player.name);
				},
			},
			{
				label: isFriend ? t`Revoke Friendship` : t`Add as Friend`,
				color: '#e6a6b6',
				onClick: () => void toggleFriend(),
			},
		],
		...hostActions(player.characterId, close, {
			give: t`Give Host`, kick: t`Kick`,
		}),
		{
			label: t`Close`,
			color: '#9a9a9a',
			onClick: close,
		},
	];

	return (
		<ContextMenu
			header={<PlayerCard character={player} className="player-menu__card" />}
			onClose={close}
			options={options}
			numbered
		/>
	);
}
