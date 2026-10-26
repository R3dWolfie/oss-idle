import { faStar } from '@fortawesome/free-solid-svg-icons/faStar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { t } from '@lingui/core/macro';

import useSynced from '@oss-idle/shared/hooks/useSynced';

import { linkFor } from '../state';
import {
	gifFavorites,
	showMedia,
	toggleGif,
} from './gifPrefs';
import { mediaIn } from './media';

/** Under a line: the GIFs and pictures it links to, small; a click asks to open the link as any link
 *  does, the ★ keeps one for the picker's GIF tab. Off in the options: nothing (the links stay). */
export default function ChatMediaView({ text }: { text: string }) {
	const [on] = useSynced(showMedia);
	const [favorites] = useSynced(gifFavorites);
	if (!on) return null;
	const media = mediaIn(text);
	if (!media.length) return null;
	return (
		<span className="chat__media">
			{media.map(m => {
				const starred = favorites.some(g => g.src === m.src);
				return (
					<span key={m.src} className="chat__media-item">
						{m.video
							? <video src={m.src} autoPlay loop muted playsInline onClick={() => void linkFor.set(m.url)} />
							: <img src={m.src} alt="" loading="lazy" onClick={() => void linkFor.set(m.url)} />}
						<button
							type="button" className={`chat__media-star ${starred ? 'is-on' : ''}`}
							title={starred ? t`Remove from your GIFs` : t`Keep in your GIFs`}
							onClick={() => toggleGif(m)}
						><FontAwesomeIcon icon={faStar} /></button>
					</span>
				);
			})}
		</span>
	);
}
