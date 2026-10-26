import useSynced from '@oss-idle/shared/hooks/useSynced';
import type { Reactions as LineReactions } from '@oss-idle/shared/community/reactions';
import ChatText from './ChatText';
import ChatMediaView from './ChatMediaView';
import Reactions from './Reactions';
import { parseReply } from './replies';
import { onlyMedia } from './media';
import { showMedia } from './gifPrefs';

/** What a line says: its text (not when it's only a GIF's link: the GIF stands in), the GIFs and
 *  pictures it links to, and its reactions. */
export default function LineBody({ channel, id, text, link, senderId, reactions }: {
	channel: string,
	id: string,
	text: string,
	link?: { label: string, path: string },
	senderId?: number,
	reactions?: LineReactions,
}) {
	const [media] = useSynced(showMedia);
	const said = parseReply(text)?.body ?? text;
	return (
		<span className="chat__body">
			{!(media && onlyMedia(said)) && <ChatText text={text} link={link} senderId={senderId} />}
			<ChatMediaView text={said} />
			<Reactions channel={channel} id={id} reactions={reactions} />
		</span>
	);
}
