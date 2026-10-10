import './Chat.css';
import {
	useEffect,
	useRef,
	useState,
} from 'react';
import { useLingui } from '@lingui/react/macro';
import useSynced from '@osu-idle/shared/hooks/useSynced';
import { DEFAULT_CHANNEL } from '@osu-idle/shared/community/wire';
import Socket from '../../../online/socket';
import Tabs, { Tab } from '../../tabs/Tabs';
import { music } from '../../../audio/MusicPlayer';
import {
	LOGS_CHANNEL,
	logLines,
} from '../../../logs';
import {
	activeChatTab,
	chatTabs,
	pmContact,
} from './state';
import {
	contactNames,
	conversations,
	sendPm,
} from '../../../online/privateMessages';
import { blocked } from '../../../online/blocks';
import { isMatchChannel } from '@osu-idle/shared/multiplayer';
import ChatText from './ChatText';
import { isCommunityOpen } from '../../../globals';
import { showChat } from '../state';

/** A line as the log renders it; no `name` = a system line, coloured whole. */
type LogLine = {
	id: string,
	at: number,
	text: string,
	color?: string,
	name?: string,
	link?: { label: string, path: string },
};

export default function Chat() {
	const { t } = useLingui();
	const [channels = []] = useSynced(chatTabs);
	const [activeId] = useSynced(activeChatTab);
	const [names = new Map<number, string>()] = useSynced(contactNames);
	const inputRef = useRef<HTMLInputElement>(null);

	// osu! behaviour: clicking anywhere in the chat focuses the compose input
	const focusInput = () => {
		inputRef.current?.focus();
	};

	// showing the chat puts you in its input; the frame wait lets it become visible
	const [open] = useSynced(isCommunityOpen);
	const [shown] = useSynced(showChat);
	useEffect(() => {
		if (!open || !shown) return;
		const frame = requestAnimationFrame(() => inputRef.current?.focus());
		return () => cancelAnimationFrame(frame);
	}, [open, shown]);

	const closeChannel = (channel: string) => {
		void chatTabs.set(channels.filter(c => c !== channel));
	};

	const join = () => {
		if (!channels.includes(DEFAULT_CHANNEL)) void chatTabs.set([DEFAULT_CHANNEL, ...channels]);
	};

	// a span, not a button: the tab label already sits inside the Tabs <button>,
	// and nested buttons are invalid DOM
	const ChatTabButton = ({ channel } : { channel: string }) => <>
		{pmContact(channel) !== undefined
			? names.get(pmContact(channel)!) ?? channel
			: isMatchChannel(channel) ? '#multiplayer' : channel}
		<span
			role="button"
			className="chat__close"
			aria-label={t`Close channel`}
			onClick={e => {
				e.stopPropagation();
				closeChannel(channel);
			}}
		/>
	</>;

	const ChatTabContents = ({ channel } : { channel: string }) => {
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
				return `${np.set.metadata.artist} - ${np.set.metadata.title}`;
			}
			return text;
		};

		const submit = (e: React.FormEvent) => {
			e.preventDefault();
			const text = draft.trim();
			if (!text || !channels.includes(channel)) return;
			if (contact === undefined) Socket.sendChat(handleCommand(text), channel);
			else sendPm(contact, handleCommand(text));
			setDraft('');
		};

		return (<>
			<div className="chat__log" ref={logRef}>
				{shown.map((line, i) => {
					const d = new Date(line.at);
					const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

					if (line.name === undefined) {
						return (
							<div key={i} className="chat__line chat__line--system">
								<span className="chat__text" style={{ color: line.color }}>{time} {line.text}</span>
							</div>
						);
					}

					return (
						<div key={i} className="chat__line">
							<span
								className="chat__from"
								style={{ color: line.color }}
							>{`${time} ${line.name}:`}</span>
							<ChatText text={line.text} link={line.link} />
						</div>
					);
				})}
			</div>

			{channel !== LOGS_CHANNEL && (
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
	};

	const tabs: Tab[] = channels.map(channel => ({
		id: channel,
		label: <ChatTabButton channel={channel} />,
		render: () => <ChatTabContents channel={channel} />,
	}));

	return (
		<div className="chat" onClick={focusInput}>
			<div className="chat__tabs">
				<Tabs tabs={tabs} active={activeChatTab} onSelect={join} />
			</div>
			{tabs.find(t => t.id === activeId)?.render()}
		</div>
	);
}
