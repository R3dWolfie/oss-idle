import { t } from '@lingui/core/macro';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import { gifFavorites } from './gifPrefs';

/** The picker's GIF tab: the ones you starred in chat, a click hands over its link. */
export default function GifGrid({ onPick }: { onPick: (url: string) => void }) {
	const [saved] = useSynced(gifFavorites);
	return (
		<div className="emoji-picker__body emoji-picker__gifs">
			{saved.map(g => (
				<button key={g.src} type="button" title={g.url} onClick={() => onPick(g.url)}>
					{g.video
						? <video src={g.src} autoPlay loop muted playsInline />
						: <img src={g.src} alt="" loading="lazy" />}
				</button>
			))}
			{!saved.length && (
				<div className="emoji-picker__none">{t`Star a GIF in the chat (its ★) to keep it here.`}</div>
			)}
		</div>
	);
}
