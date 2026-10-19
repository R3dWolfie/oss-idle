import {
	type RefObject,
	useEffect,
	useRef,
	useState,
} from 'react';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import { ANNOUNCE_CHANNEL } from '@oss-idle/shared/community/wire';
import Socket from '../../../online/socket';
import { music } from '../../../audio/MusicPlayer';
import {
	LOGS_CHANNEL,
	logLines,
} from '../../../logs';
import {
	chatTabs,
	pmContact,
} from './state';
import {
	conversations,
	sendPm,
} from '../../../online/privateMessages';
import { blocked } from '../../../online/blocks';
import ChatText from './ChatText';
import { mapLink } from './links';
import { SITE_URL } from '../../../globals';
import {
	type MenuTarget,
	menuFor,
} from '../state';

/** A line as the log renders it; no `name` = a system line, coloured whole. */
type LogLine = {
	id: string,
	at: number,
	text: string,
	color?: string,
	name?: string,
	link?: { label: string, path: string },
	sender?: MenuTarget,
};

export default function ChatTabContents({ channel, inputRef } : {
	channel: string,
	inputRef: RefObject<HTMLInputElement>,
}) {
	const contact = pmContact(channel);
	const [lines = []] = useSynced(channel === LOGS_CHANNEL ? logLines : Socket.chat);
	const [pms = new Map()] = useSynced(conversations);
	const [blockedIds = new Set<number>()] = useSynced(blocked);
	const [draft, setDraft] = useState('');
	const logRef = useRef<HTMLDivElement>(null);

	const shown: LogLine[] = contact === undefined
		? lines.filter(l => l.channel === channel).map(l => {
			if (l.kind === 'system') return {
				id: l.id, at: l.at, text: l.text, color: l.color, name: l.name, link: l.link,
			};
			// a blocked player's line, with not even their name
			if (blockedIds.has(l.from.userId)) return {
				id: l.id, at: l.at, text: '<block>',
			};
			return {
				id: l.id, at: l.at, text: l.text, color: l.from.color, name: l.from.name,
				sender: {
					...l.from, line: l,
				},
			};
		})
		: (pms.get(contact) ?? []);

	useEffect(() => {
		const el = logRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [shown.length]);

	const handleCommand = (text: string) => {
		if (text === '/np') {
			const np = music.beatmap.get();
			if (!np) return 'Nothing is playing';
			const { artist, title } = np.set.metadata;
			return mapLink(SITE_URL, {
				setId: np.set.metadata.id, beatmapId: np.metadata.id,
			}, `${artist} - ${title} [${np.metadata.version}]`);
		}
		return text;
	};

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		const text = draft.trim();
		if (!text || !chatTabs.get()?.includes(channel)) return;
		if (contact === undefined) Socket.sendChat(handleCommand(text), channel);
		else sendPm(contact, handleCommand(text));
		setDraft('');
	};

	return (<>
		<div className="chat__log" ref={logRef}>
			{shown.map(line => {
				const d = new Date(line.at);
				const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

				if (line.name === undefined) {
					return (
						<div key={line.id} className="chat__line chat__line--system">
							<span className="chat__text" style={{ color: line.color }}>{time} {line.text}</span>
						</div>
					);
				}

				const { sender } = line;
				return (
					<div key={line.id} className="chat__line">
						<span className="chat__from" style={{ color: line.color }}>
							{`${time} `}
							<span
								className={sender ? 'chat__name' : undefined}
								onClick={sender && (e => {
									e.stopPropagation();
									void menuFor.set({ ...sender });
								})}
							>{line.name}</span>:
						</span>
						<ChatText text={line.text} link={line.link} />
					</div>
				);
			})}
		</div>

		{channel !== LOGS_CHANNEL && channel !== ANNOUNCE_CHANNEL && (
			<form className="chat__compose" onSubmit={submit}>
				<span>
					{'>'}
				</span>
				<input
					ref={inputRef}
					type="text"
					value={draft}
					onChange={e => setDraft(e.target.value)}
				/>
			</form>
		)}
	</>);
}
