import {
	medalById,
	medalLook,
} from '@osu-idle/shared/achievements/catalogue';
import { medalName } from '@osu-idle/shared/display/medals';
import MedalIcon from '../character/MedalIcon';

/** A medal of a progression line, small, dimmed until reached. */
export default function MedalLineIcon({ id, lit = true }: { id: string, lit?: boolean }) {
	const medal = medalById(id);
	if (!medal) return null;
	return <span className={`medal-line__icon ${lit ? '' : 'is-locked'}`} title={medalName(id)}>
		<MedalIcon look={medalLook(medal)} />
	</span>;
}
