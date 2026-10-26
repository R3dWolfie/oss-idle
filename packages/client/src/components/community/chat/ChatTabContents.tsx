import { faReply } from '@fortawesome/free-solid-svg-icons/faReply';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	ph,
	t,
} from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
	type RefObject,
	useEffect,
	useRef,
	useState,
} from 'react';

import type { Reactions as LineReactions } from '@oss-idle/shared/community/reactions';
import {
	ANNOUNCE_CHANNEL,
	type ReplyQuote,
} from '@oss-idle/shared/community/wire';
import clock from '@oss-idle/shared/display/clock';
import useSynced from '@oss-idle/shared/hooks/useSynced';

import { music } from '../../../audio/MusicPlayer';
import { SITE_URL } from '../../../globals';
import {
	logLines,
	LOGS_CHANNEL,
} from '../../../logs';
import Auth from '../../../online/auth';
import { blocked } from '../../../online/blocks';
import { emojiSrc } from '../../../online/emoji';
import {
	conversations,
	sendPm,
} from '../../../online/privateMessages';
import Socket from '../../../online/socket';
import {
	menuFor,
	type MenuTarget,
} from '../state';
import ChatText from './ChatText';
import { mapLink } from './links';
import {
	MENTION_COLOR,
	mentionsMe,
} from './mentions';
import MentionSuggestions from './MentionSuggestions';
import Reactions from './Reactions';
import ReactPicker from './ReactPicker';
import ReplyBar from './ReplyBar';
import ReplyRef from './ReplyRef';
import {
	chatTabs,
	pmContact,
} from './state';
import useEmojiSuggest from './useEmojiSuggest';
import useNameComplete from './useNameComplete';
import useReply from './useReply';

/** A line as the log renders it; no `name` = a system line, coloured whole. */
type LogLine = {
	id: string,
	at: number,
	text: string,
	color?: string,
	name?: string,
	fromId?: number,
	fromColor?: string,
	link?: { label: string, path: string },
	sender?: MenuTarget,
	replyTo?: ReplyQuote,
	reactions?: LineReactions,
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
				id: l.id, at: l.at, text: l.text, name: l.from.name, fromId: l.from.userId, fromColor: l.from.color,
				reactions: l.reactions,
				color: mentionsMe(l.text) && l.from.userId !== me ? MENTION_COLOR : l.from.color,
				replyTo: l.replyTo,
				sender: {
					...l.from, line: l,
				},
			};
		})
		: (pms.get(contact) ?? []);
	const names = useNameComplete(draft, setDraft, inputRef, shown);
	const reply = useReply(shown, logRef, inputRef);

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

	// emoji first (their list takes Tab while it's open), then player names: the @ list or Tab's cycle
	const complete = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (!emoji.onKeyDown(e) && !names.onKeyDown(e)) reply.onKeyDown(e);
	};

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		const text = draft.trim();
		if (!text || !chatTabs.get()?.includes(channel)) return;
		if (contact === undefined) {
			const out = reply.send(handleCommand(text));
			Socket.sendChat(out.text, channel, out.replyTo);
		} else sendPm(contact, handleCommand(text));
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
					<div key={line.id} className="chat__line" data-line={line.id}>
						<ReplyRef to={line.replyTo} reply={reply} />
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
						<span className="chat__body">
							<ChatText text={line.text} link={line.link} senderId={line.fromId} />
							<Reactions channel={channel} id={line.id} reactions={line.reactions} />
						</span>
						{contact === undefined && line.fromId !== undefined && line.text !== '<deleted>' && (
							<span className="chat__line-actions">
								<button
									type="button" className="chat__line-btn" aria-label={t`Reply`}
									onClick={() => reply.start(line)}
								><FontAwesomeIcon icon={faReply} /></button>
								<ReactPicker channel={channel} id={line.id} />
							</span>
						)}
					</div>
				);
			})}
		</div>

		{channel !== LOGS_CHANNEL && channel !== ANNOUNCE_CHANNEL && (
			<form className="chat__compose" onSubmit={submit}>
				<ReplyBar
					target={reply.target}
					onCancel={reply.cancel}
					inputRef={inputRef}
					draft={draft}
				/>
				<MentionSuggestions mention={names} inputRef={inputRef} draft={draft} />
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
								<img className="chat__emoji-img" src={emojiSrc(s.id)} alt="" />
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
						names.typed();
						setDraft(e.target.value);
					}}
					onKeyDown={complete}
				/>
			</form>
		)}
	</>);
}
