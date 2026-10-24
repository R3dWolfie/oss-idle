import {
	useEffect,
	useState,
} from 'react';
import { fileType } from '@oss-idle/shared/osuSkin/files';
import type { SkinFile } from '@oss-idle/shared/skin';
import type OsuSkin from '../../osu/skin/OsuSkin';
import { fileSize } from './fileSize';

const AUDIO = new Set(['wav', 'ogg', 'mp3']);

/** One file of a skin: its image, or a button that plays its sound. Read only once shown. */
export default function SkinFileTile({ osu, file }: { osu: OsuSkin, file: SkinFile }) {
	const [url, setUrl] = useState<string>();
	const sound = AUDIO.has(fileType(file.path));
	const slash = file.path.lastIndexOf('/');
	const name = file.path.slice(slash + 1);
	const folder = file.path.slice(0, Math.max(0, slash));
	useEffect(() => {
		if (!sound) void osu.thumbUrl(file.path).then(setUrl);
	}, [osu, file.path]);

	const play = async () => {
		const src = url ?? await osu.url(file.path);
		setUrl(src);
		if (src) void new Audio(src).play().catch(() => {});
	};

	return (
		<div className='skin-file'>
			{sound
				? <button className='skin-file__play' onClick={() => void play()}>▶</button>
				: <div className='skin-file__image'>
					{url && <img src={url} alt='' loading='lazy' draggable={false} />}
				</div>}
			<span className='skin-file__name'>{name}</span>
			{folder && <span className='skin-file__folder'>{folder}</span>}
			<span className='skin-file__size'>{fileSize(file.size)}</span>
		</div>
	);
}
