import useSynced from '@oss-idle/shared/hooks/useSynced';
import { versionLabel } from '@oss-idle/shared/rate';
import { selectedRate } from '../gameplay/playRate';

/** " [Beginner x1.3]": a difficulty at the rate it's played at - the picked one,
 *  unless the play's own is known. */
export default function RatedVersion({ version, rate }: { version: string, rate?: number }) {
	const [picked] = useSynced(selectedRate);
	return <span> [{versionLabel(version, rate ?? picked ?? 1)}]</span>;
}
