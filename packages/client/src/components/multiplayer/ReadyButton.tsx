import { useState } from 'react';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import {
	matchPlayers,
	type Match,
} from '@osu-idle/shared/multiplayer';
import Multiplayer from '../../online/multiplayer';
import ConfirmMenu from '../ConfirmMenu';
import OverChat from './OverChat';

/** Ready! / Not Ready; for a ready host, Start Game! - which forces everyone with
 *  the map in, ready or not, after a confirm when some aren't. */
export default function ReadyButton({ match }: { match: Match }) {
	const { t } = useLingui();
	const [confirming, setConfirming] = useState(false);
	const mine = Multiplayer.mySlot(match);
	if (!mine || match.playing) return null;

	const starting = Multiplayer.isHost(match) && mine.ready;
	const allReady = matchPlayers(match).every(s => s.ready || s.noMap);
	const start = () => Multiplayer.send({ type: 'mp:start' });

	const press = () => {
		if (!starting) Multiplayer.send({
			type: 'mp:ready', ready: !mine.ready,
		});
		else if (allReady) start();
		else setConfirming(true);
	};

	let label = <Trans>Ready!</Trans>;
	if (starting) label = <Trans>Start Game!</Trans>;
	else if (mine.ready) label = <Trans>Not Ready</Trans>;

	return (<>
		<button
			type="button"
			className="mp-action is-blue"
			onClick={press}
			disabled={mine.noMap || !match.beatmap}
		>
			{label}
		</button>
		{confirming && <OverChat><ConfirmMenu
			title={t`Start Game`}
			sub={t`Not everyone is ready. Start anyway?`}
			confirmLabel={t`Start Game!`}
			color="#5aa02c"
			onConfirm={start}
			onClose={() => setConfirming(false)}
		/></OverChat>}
	</>);
}
