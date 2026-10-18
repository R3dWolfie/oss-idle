import useSynced from '@osu-idle/shared/hooks/useSynced';
import type Synced from '@osu-idle/shared/helpers/synced';

/** A bottom-right toggle button backed by a boolean Synced (a persisted Setting). */
export default function CommunityToggle({
	value, label, onClick, unread,
}: { value: Synced<boolean>; label: string; onClick?: () => void; unread?: boolean }) {
	const [on] = useSynced(value);
	return (
		<button
			className="community-controls__btn"
			data-on={on}
			data-unread={unread}
			tabIndex={-1}
			onMouseDown={e => e.preventDefault()}
			onClick={() => {
				if (onClick) {
					onClick?.();
				} else {
					value.set(!value.get());
				}
			}}
		>{label}</button>
	);
}
