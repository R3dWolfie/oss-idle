import type { Reactions as LineReactions } from '@oss-idle/shared/community/reactions';
import useSynced from '@oss-idle/shared/hooks/useSynced';

import ChatMediaView from './ChatMediaView';
import ChatText from './ChatText';
import { showMedia } from './gifPrefs';
import { onlyMedia } from './media';
import Reactions from './Reactions';
import { parseReply } from './replies';

/** What a line says: its text (a GIF's link left out of it, the GIF stands in; a line that's only one
 *  has no text), the GIFs and pictures it links to, and its reactions. */
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
			{!(media && onlyMedia(said)) && (
				<ChatText text={text} link={link} senderId={senderId} media={media ? 'hide' : 'show'} />
			)}
			<ChatMediaView text={said} />
			<Reactions channel={channel} id={id} reactions={reactions} />
		</span>
	);
}
