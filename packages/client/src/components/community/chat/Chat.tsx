import './Chat.css';
import {
	useEffect,
	useRef,
} from 'react';
import { useLingui } from '@lingui/react/macro';
import useSynced from '@osu-idle/shared/hooks/useSynced';
import { DEFAULT_CHANNEL } from '@osu-idle/shared/community/wire';
import Tabs, { Tab } from '../../tabs/Tabs';
import {
	activeChatTab,
	chatTabs,
	pmContact,
} from './state';
import { contactNames } from '../../../online/privateMessages';
import { isMatchChannel } from '@osu-idle/shared/multiplayer';
import ChatTabContents from './ChatTabContents';
import { isCommunityOpen } from '../../../globals';
import { showChat } from '../state';

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

	const tabs: Tab[] = channels.map(channel => ({
		id: channel,
		label: <ChatTabButton channel={channel} />,
		render: () => <ChatTabContents key={channel} channel={channel} inputRef={inputRef} />,
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
