import {
	type RefObject,
	useEffect,
	useRef,
	useState,
} from 'react';
import { ph } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import clock from '@oss-idle/shared/display/clock';
import { ANNOUNCE_CHANNEL } from '@oss-idle/shared/community/wire';
import Socket from '../../../online/socket';
import Auth from '../../../online/auth';
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
import useEmojiSuggest from './useEmojiSuggest';
import { replaceShortcodes } from './emoji';
import { mapLink } from './links';
import {
	MENTION_COLOR,
	mentionsMe,
} from './mentions';
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
	const completion = useRef<{ start: number, matches: string[], index: number }>(undefined);
	const emoji = useEmojiSuggest(draft, setDraft, inputRef);
	const [user] = useSynced(Auth.user);
	const me = user?.id;

	const shown: LogLine[] = contact === undefined
		? lines.filter(l => l.channel === channel).map(l => {
			if (l.kind === 'system') return {
				id: l.id, at: l.at, text: l.text, color: l.color, name: l.name, link: l.link,
				sender: l.from && l.name !== undefined ? {
					...l.from, name: l.name,
				} : undefined,
			};
			// a blocked player's line, with not even their name
			if (blockedIds.has(l.from.userId)) return {
				id: l.id, at: l.at, text: '<block>',
			};
			return {
				id: l.id, at: l.at, text: l.text, name: l.from.name,
				color: mentionsMe(l.text) && l.from.userId !== me ? MENTION_COLOR : l.from.color,
				sender: {
					...l.from, line: l,
				},
			};
		})
		: (pms.get(contact) ?? []);

	useEffect(() => {
		const el = logRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [shown[shown.length - 1]?.id]);

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

	// Tab completes an online player's name; pressing it again cycles
	const complete = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (emoji.onKeyDown(e)) return;
		if (e.key !== 'Tab') return;
		e.preventDefault();
		if (!completion.current) {
			const start = draft.lastIndexOf(' ') + 1;
			const prefix = draft.slice(start).toLowerCase();
			const matches = [...new Set(Socket.presence.get().map(p => p.name))]
				.filter(name => name.toLowerCase().startsWith(prefix))
				.sort((a, b) => a.localeCompare(b));
			if (!prefix || !matches.length) return;
			completion.current = {
				start, matches, index: -1, 
			};
		}
		const c = completion.current;
		c.index = (c.index + 1) % c.matches.length;
		setDraft(draft.slice(0, c.start) + c.matches[c.index]);
	};

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		const text = replaceShortcodes(draft.trim());
		if (!text || !chatTabs.get()?.includes(channel)) return;
		if (contact === undefined) Socket.sendChat(handleCommand(text), channel);
		else sendPm(contact, handleCommand(text));
		setDraft('');
	};

	return (<>
		<div className="chat__log" ref={logRef}>
			{shown.map(line => {
				const time = clock(line.at);

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
				{emoji.query && emoji.suggestions.length > 0 && (
					<div className="chat__emoji">
						<div className="chat__emoji-title">
							<Trans>Emoji matching <b>:{ph({ query: emoji.query })}</b></Trans>
						</div>
						{emoji.suggestions.map((s, i) => (
							<button
								key={s.name}
								type="button"
								className={`chat__emoji-option ${i === emoji.picked ? 'is-picked' : ''}`}
								onMouseEnter={() => emoji.setPicked(i)}
								onMouseDown={e => e.preventDefault()}
								onClick={() => emoji.insert(s)}
							>
								<span className="chat__emoji-char">{s.char}</span>
								:{s.name}:
							</button>
						))}
					</div>
				)}
				<span>
					{'>'}
				</span>
				<input
					ref={inputRef}
					type="text"
					value={draft}
					onChange={e => {
						completion.current = undefined;
						setDraft(e.target.value);
					}}
					onKeyDown={complete}
				/>
			</form>
		)}
	</>);
}
