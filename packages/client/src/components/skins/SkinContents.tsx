import { useMemo } from 'react';
import {
	Plural,
	Trans,
	useLingui,
} from '@lingui/react/macro';
import { ph } from '@lingui/core/macro';
import type { SkinFile } from '@oss-idle/shared/skin';
import type OsuSkin from '../../osu/skin/OsuSkin';
import {
	maniaPaths,
	SKIN_CATEGORIES,
	skinCategory,
	type SkinCategory,
} from '../../osu/skin/categories';
import SkinCategoryGroup from './SkinCategoryGroup';
import SkinIniText from './SkinIniText';
import { fileSize } from './fileSize';

/** What a skin holds: its settings, then its files by the part of the game they skin. */
export default function SkinContents({ osu, files }: { osu: OsuSkin, files: SkinFile[] }) {
	const { t } = useLingui();
	const labels: Record<SkinCategory, string> = {
		mania: 'osu!mania',
		osu: 'osu!',
		taiko: 'osu!taiko',
		catch: 'osu!catch',
		interface: t`Interface`,
		sounds: t`Sounds`,
		other: t`Other files`,
	};
	const groups = useMemo(() => {
		const mania = maniaPaths(osu.ini);
		const out = Object.fromEntries(SKIN_CATEGORIES.map(c => [c, [] as SkinFile[]])) as
			Record<SkinCategory, SkinFile[]>;
		const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
		for (const f of sorted) out[skinCategory(f.path, mania)].push(f);
		return out;
	}, [osu, files]);
	const { general } = osu.ini;
	const keys = osu.ini.mania.map(m => m.keys).sort((a, b) => a - b).map(k => `${k}K`).join(', ');
	const size = fileSize(files.reduce((total, f) => total + f.size, 0));

	return (
		<div className='skin-contents'>
			<div className='skin-contents__summary'>
				<span>
					<Plural value={ph({ count: files.length })} one='# file' other='# files' />, {size}
				</span>
				<span><Trans>skin.ini version {ph({ version: String(general.version) })}</Trans></span>
				{keys && <span><Trans>osu!mania layouts: {ph({ keys })}</Trans></span>}
			</div>
			{SKIN_CATEGORIES.map(c => groups[c].length > 0 && (
				<SkinCategoryGroup key={c} label={labels[c]} osu={osu} files={groups[c]} />
			))}
			<details className='skin-contents__group'>
				<summary>skin.ini</summary>
				<SkinIniText osu={osu} name='skin.ini' />
			</details>
			{osu.has('idle.ini') && <details className='skin-contents__group'>
				<summary>idle.ini</summary>
				<SkinIniText osu={osu} name='idle.ini' />
			</details>}
		</div>
	);
}
