import useSynced from '@oss-idle/shared/hooks/useSynced';
import { shownMedals } from '../../online/medalWatch';
import MedalUnlockOverlay from './MedalUnlockOverlay';

export default function ShownMedals() {
	const [shown] = useSynced(shownMedals);
	if (!shown) return null;
	return <MedalUnlockOverlay waves={shown.waves} held={shown.held} />;
}
