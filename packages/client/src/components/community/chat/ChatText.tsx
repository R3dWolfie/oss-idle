import {
	isWebOpen,
	webUrl,
} from '../../../globals';

/** A line's text, its `link` part opening a web platform page. */
export default function ChatText({ text, link }: {
	text: string,
	link?: { label: string, path: string },
}) {
	const at = link ? text.indexOf(link.label) : -1;
	if (!link || at < 0) return <span className="chat__text">{text}</span>;
	const open = () => {
		void webUrl.set(link.path);
		void isWebOpen.set(true);
	};
	return (
		<span className="chat__text">
			{text.slice(0, at)}
			<a className="chat__link" onClick={open}>{link.label}</a>
			{text.slice(at + link.label.length)}
		</span>
	);
}
