import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import type { PresenceEntry } from '@oss-idle/shared/community/presence';
import type { MatchSlot } from '@oss-idle/shared/multiplayer';
import { rateLabel } from '@oss-idle/shared/rate';

/** What a seat reads: Open, Locked, or the player and their state. */
export default function SlotLabel({ slot, player }: {
	slot: MatchSlot,
	player?: PresenceEntry,
}) {
	const { i18n } = useLingui();
	if (slot.state === 'open') return <Trans>Open</Trans>;
	if (slot.state === 'locked') return <Trans>Locked</Trans>;
	return <>
		{player?.name ?? '...'}
		{slot.playing && <> <Trans>[playing]</Trans></>}
		{!slot.playing && slot.noMap && <> <Trans>[no map]</Trans></>}
		{(slot.rate ?? 1) !== 1 && <span className="mp-slot__rate">{rateLabel(slot.rate!)}</span>}
		{player?.rank !== undefined && (
			<span className="mp-slot__rank">#{player.rank.toLocaleString(i18n.locale)}</span>
		)}
	</>;
}
