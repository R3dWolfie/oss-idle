import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** The frame of the OAuth application dialogs. */
export default function OAuthDialog({ title, error, onClose, children }: {
	title: ReactNode;
	error?: string;
	onClose: () => void;
	children: ReactNode;
}) {
	return createPortal(<>
		<div className='__blackout visible' onClick={onClose} />
		<div className='oauth-dialog' role='dialog'>
			<div className='oauth-dialog__title'>{title}</div>
			{children}
			{error && <div className='oauth-dialog__error'>{error}</div>}
		</div>
	</>, document.body);
}
