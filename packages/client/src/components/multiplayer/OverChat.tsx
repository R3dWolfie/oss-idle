import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** osu!'s multiplayer dialogs cover the whole screen, chat included. */
export default function OverChat({ children }: { children: ReactNode }) {
	return createPortal(<div className="mp-over-chat">{children}</div>, document.body);
}
