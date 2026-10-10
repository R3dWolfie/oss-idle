import useSynced from '@osu-idle/shared/hooks/useSynced';
import { pushedMedals } from '../../online/medalWatch';
import { medalUnlocks } from '../../achievements/medalUnlocks';
import MedalUnlockOverlay from './MedalUnlockOverlay';

export default function PushedMedals() {
	const [batch] = useSynced(pushedMedals);
	if (!batch) return null;
	// held only grows, so each batch gets a fresh overlay
	return <MedalUnlockOverlay key={batch.held} medals={medalUnlocks(batch.ids)} held={batch.held} />;
}
