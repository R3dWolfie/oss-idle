import {
	useRef,
	useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useLingui } from '@lingui/react/macro';
import ContextMenu from '../ContextMenu';
import PlayQueue from '../../gameplay/playQueue';
import { Playlist } from '../../db/schema/playlist';

type Props = {
	onClose: () => void;
};

/** Names a playlist and fills it with the queue in its order, each map at its
 *  locked rate and repeat. */
export default function SaveQueuePrompt({ onClose }: Props) {
	const { t } = useLingui();
	const [name, setName] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);

	const save = async () => {
		const trimmed = name.trim();
		const entries = PlayQueue.state.get()?.entries ?? [];
		if (!trimmed || !entries.length) return;
		onClose();
		// no twins, as in the playlist manager: an existing name gets the maps added
		const playlist = await Playlist.byName(trimmed) ?? await Playlist.create(trimmed);
		for (const { beatmap, repeat } of entries) {
			await playlist.addBeatmap(beatmap.metadata.id, beatmap.lockedRate, repeat);
		}
	};

	// the dock's backdrop-filter would pin a fixed overlay inside the dock
	return createPortal(
		<ContextMenu
			title={t`Save the queue as a playlist`}
			focus={inputRef}
			onClose={onClose}
			numbered
			options={[
				{
					label: t`Save`, color: '#5aa02c', onClick: () => void save(),
				},
				{
					label: t`Cancel`, color: '#6b6b6b', onClick: onClose,
				},
			]}
		>
			<input
				ref={inputRef}
				className="ctxmenu__input"
				value={name}
				placeholder={t`Playlist name`}
				spellCheck={false}
				autoComplete="off"
				onChange={e => setName(e.target.value)}
				onClick={e => e.stopPropagation()}
				onKeyDown={e => { if (e.key === 'Enter') void save(); }}
			/>
		</ContextMenu>,
		document.body,
	);
}
