import { useLingui } from '@lingui/react/macro';
import { LoadingPanel } from '../../scenes/Transition';

/** Over the playfield once our play of a round is over, while the others still play. */
export default function RoundWaiting() {
	const { t } = useLingui();
	return (
		<div className="mp-round-waiting">
			<LoadingPanel title={t`Waiting for the other players to finish...`} />
		</div>
	);
}
