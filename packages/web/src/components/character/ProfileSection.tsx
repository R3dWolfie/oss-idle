import {
	type ReactNode,
	useRef,
} from 'react';
import { useLingui } from '@lingui/react/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import type { ProfileSection as Section } from '@oss-idle/shared/profile';

const DRAG_TYPE = 'application/x-profile-section';

/** One profile block; a supporter drags it by its handle to reorder their profile. */
export default function ProfileSection({ section, movable, onMove, children }: {
	section: Section;
	movable: boolean;
	/** Put `from` where this section is. */
	onMove: (from: Section, to: Section) => void;
	children: ReactNode;
}) {
	const { t } = useLingui();
	const el = useRef<HTMLDivElement>(null);

	if (!movable) return <div className='character__section'>{children}</div>;

	return <div
		ref={el}
		className='character__section'
		onDragOver={e => { if (e.dataTransfer.types.includes(DRAG_TYPE)) e.preventDefault(); }}
		onDrop={e => {
			const from = e.dataTransfer.getData(DRAG_TYPE) as Section;
			if (from && from !== section) onMove(from, section);
		}}
	>
		<span
			className='character__section-handle'
			title={t`Drag to reorder`}
			draggable
			onDragStart={e => {
				e.dataTransfer.setData(DRAG_TYPE, section);
				e.dataTransfer.effectAllowed = 'move';
				if (el.current) e.dataTransfer.setDragImage(el.current, 0, 0);
			}}
		>
			<FontAwesomeIcon icon={faBars} />
		</span>
		{children}
	</div>;
}
