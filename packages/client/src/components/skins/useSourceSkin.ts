import {
	useEffect,
	useState,
} from 'react';
import OsuSkin, { type SkinSource } from '../../osu/skin/OsuSkin';
import Skin from '../../osu/skin/Skin';

/** A skin to preview from its files, let go when they change or the view closes. */
export const useSourceSkin = (source: SkinSource | undefined): Skin | undefined => {
	const [skin, setSkin] = useState<Skin>();
	useEffect(() => {
		if (!source) return;
		let alive = true;
		let made: Skin | undefined;
		void OsuSkin.load(source)
			.then(osu => Skin.create(osu, true))
			.then(s => {
				made = s;
				if (alive) setSkin(s);
				else s.dispose();
			});
		return () => {
			alive = false;
			made?.dispose();
		};
	}, [source]);
	return skin;
};
