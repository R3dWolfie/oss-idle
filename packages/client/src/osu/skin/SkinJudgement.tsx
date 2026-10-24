import type { Judgement } from '@oss-idle/shared/judgement';
import type Skin from './Skin';
import { judgementKey } from './Skin';
import { useSkinImage } from './useSkinImage';

/** A judgement as the skin draws its hit burst, for the results screen; its name until read. */
export default function SkinJudgement({ skin, judgement, className }: {
	skin: Skin, judgement: Judgement, className: string,
}) {
	const url = useSkinImage(skin, judgementKey(judgement), () => skin.judgementUrl(judgement));
	const { text } = skin.data.judgements[judgement];
	return url
		? <img className={className} src={url} alt={text} draggable={false} />
		: <span className={className}>{text}</span>;
}
