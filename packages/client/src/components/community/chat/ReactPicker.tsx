import {
	useEffect,
	useRef,
	useState,
} from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFaceSmile } from '@fortawesome/free-solid-svg-icons/faFaceSmile';
import { t } from '@lingui/core/macro';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import Socket from '../../../online/socket';
import Auth from '../../../online/auth';
import EmojiPicker from './EmojiPicker';

/** The ☺ on a line under the pointer: the emoji picker, to react with. */
export default function ReactPicker({ channel, id }: { channel: string, id: string }) {
	const [open, setOpen] = useState(false);
	const [user] = useSynced(Auth.user);
	const root = useRef<HTMLSpanElement>(null);

	// a click anywhere else closes it
	useEffect(() => {
		if (!open) return;
		const outside = (e: MouseEvent) => {
			const at = e.target as Element;
			if (!root.current?.contains(at) && !at.closest?.('.emoji-picker')) setOpen(false);
		};
		window.addEventListener('mousedown', outside, true);
		return () => window.removeEventListener('mousedown', outside, true);
	}, [open]);

	if (!user) return null;
	const toggle = () => setOpen(!open);
	return (
		<span className="chat__react" ref={root}>
			<button type="button" className="chat__line-btn" title={t`React`} onClick={toggle}>
				<FontAwesomeIcon icon={faFaceSmile} />
			</button>
			{open && (
				<EmojiPicker
					anchor={root}
					onPick={e => {
						Socket.sendReact(channel, id, e.id, true);
						setOpen(false);
					}}
					onClose={() => setOpen(false)}
				/>
			)}
		</span>
	);
}
