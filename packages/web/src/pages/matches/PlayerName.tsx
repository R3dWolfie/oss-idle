import Flag from '../../components/Flag';
import Link from '../../components/Link';
import type { HistoryPlayer } from './types';

export default function PlayerName({ player, flag = false }: {
	player: HistoryPlayer,
	flag?: boolean,
}) {
	return <>
		{flag && <Flag country={player.country} />}
		<Link className='match__player' to='/c/$id' params={{ id: String(player.id) }}>{player.name}</Link>
	</>;
}
