import {
	useEffect,
	useState,
} from 'react';
import { decodeIni } from '@oss-idle/shared/osuSkin/ini';
import type OsuSkin from '../../osu/skin/OsuSkin';

/** One of the skin's settings files (skin.ini, idle.ini) as written. */
export default function SkinIniText({ osu, name }: { osu: OsuSkin, name: string }) {
	const [text, setText] = useState<string>();
	useEffect(() => {
		void osu.bytes(name).then(b => setText(b ? decodeIni(new Uint8Array(b)) : ''));
	}, [osu, name]);
	return <pre className='skin-contents__ini'>{text}</pre>;
}
