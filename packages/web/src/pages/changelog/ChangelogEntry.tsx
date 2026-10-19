import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import type { Entry } from './builds';

/** Inline `code` is the only markup a title carries, as on osu!. */
const title = (text: string) =>
	text.split(/`([^`]+)`/).map((part, i) => i % 2 ? <code key={i}>{part}</code> : part);

export default function ChangelogEntry({ entry }: { entry: Entry }) {
	return (
		<div className={`changelog-entry ${entry.major ? 'changelog-entry--major' : ''}`}>
			<span className='changelog-entry__title-icon'>
				<FontAwesomeIcon icon={entry.type === 'add' ? faPlus : faCheck} className='changelog-entry__icon' />
			</span>
			{title(entry.title)}
		</div>
	);
}
