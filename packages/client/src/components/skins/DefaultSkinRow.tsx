import { ph } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import ListingIcon from '../listing/ListingIcon';
import { currentSkinDAO } from '../../osu/skin/Skin';
import { SETTINGS } from '../../db/settings';

type Props = {
	busy: boolean,
	onExport: () => void,
};

/** oss!idle's own skin, on when no other is. */
export default function DefaultSkinRow({ busy, onExport }: Props) {
	const [current] = useSynced(currentSkinDAO);
	const [editor] = useSynced(SETTINGS.editorSkin);
	return (
		<div className={`listing ${current ? '' : 'is-on'}`}>
			<ListingIcon url={undefined} name='oss!idle' />
			<div className='listing__main'>
				<div className='listing__name'><Trans>Default skin</Trans></div>
				<div className='listing__by'><Trans>by {ph({ author: 'oss!idle' })}</Trans></div>
			</div>
			<div className='listing__actions'>
				<label className='listing-toggle'>
					<input
						type='checkbox'
						checked={!current}
						disabled={busy || !current}
						onChange={() => current?.setEnabled(false)}
					/>
					<span><Trans>Enabled</Trans></span>
				</label>
				<label className='listing-toggle'>
					<input
						type='checkbox'
						checked={!editor}
						disabled={busy || !editor}
						onChange={() => SETTINGS.editorSkin.set(0)}
					/>
					<span><Trans>Editor</Trans></span>
				</label>
				<button className='listing-btn' disabled={busy} onClick={onExport}>
					<Trans>Export</Trans>
				</button>
			</div>
		</div>
	);
}
