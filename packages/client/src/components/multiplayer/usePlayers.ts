import { useMemo } from 'react';
import useSynced from '@osu-idle/shared/hooks/useSynced';
import type { PresenceEntry } from '@osu-idle/shared/community/presence';
import Socket from '../../online/socket';

/** Online players by character id - a match only carries ids. */
export default function usePlayers(): Map<number, PresenceEntry> {
	const [presence = []] = useSynced(Socket.presence);
	return useMemo(() => new Map(presence.map(p => [p.characterId, p])), [presence]);
}
