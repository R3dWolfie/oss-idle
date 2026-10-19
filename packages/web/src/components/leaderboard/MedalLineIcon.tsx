import {
	medalById,
	medalLook,
} from '@oss-idle/shared/achievements/catalogue';
import { medalName } from '@oss-idle/shared/display/medals';
import MedalIcon from '../character/MedalIcon';

/** A medal of a progression line, small, dimmed until reached. */
export default function MedalLineIcon({ id, lit = true }: { id: string, lit?: boolean }) {
	const medal = medalById(id);
	if (!medal) return null;
	return <span className={`medal-line__icon ${lit ? '' : 'is-locked'}`} title={medalName(id)}>
		<MedalIcon look={medalLook(medal)} />
	</span>;
}
