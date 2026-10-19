import {
	isWebOpen,
	webUrl,
} from '../../../globals';
import { linkFor } from '../state';
import { splitLinks } from './links';
import { openChatMap } from './openMap';

/** The text with each map and web address it contains clickable. */
const linked = (text: string) => splitLinks(text).map((part, i) => {
	if (typeof part === 'string') return part;
	const open = 'map' in part
		? () => void openChatMap(part.map)
		: () => void linkFor.set(part.url);
	return <a key={i} className="chat__link" onClick={open}>{part.text}</a>;
});

/** A line's text, its `link` part opening a web platform page. */
export default function ChatText({ text, link }: {
	text: string,
	link?: { label: string, path: string },
}) {
	const at = link ? text.indexOf(link.label) : -1;
	if (!link || at < 0) return <span className="chat__text">{linked(text)}</span>;
	const open = () => {
		void webUrl.set(link.path);
		void isWebOpen.set(true);
	};
	return (
		<span className="chat__text">
			{linked(text.slice(0, at))}
			<a className="chat__link" onClick={open}>{link.label}</a>
			{linked(text.slice(at + link.label.length))}
		</span>
	);
}
