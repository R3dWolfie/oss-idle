import { useState } from 'react';
import type { SkinFile } from '@oss-idle/shared/skin';
import type OsuSkin from '../../osu/skin/OsuSkin';
import SkinFileTile from './SkinFileTile';

type Props = {
	label: string,
	osu: OsuSkin,
	files: SkinFile[],
};

/** One part of a skin (osu!mania, sounds, ...), folded until opened: nothing is read before. */
export default function SkinCategoryGroup({ label, osu, files }: Props) {
	const [open, setOpen] = useState(false);
	return (
		<details className='skin-contents__group' onToggle={e => setOpen(e.currentTarget.open)}>
			<summary>{label}<span className='skin-contents__count'>{files.length}</span></summary>
			{open && <div className='skin-contents__files'>
				{files.map(f => <SkinFileTile key={f.path} osu={osu} file={f} />)}
			</div>}
		</details>
	);
}
