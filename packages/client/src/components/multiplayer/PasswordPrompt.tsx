import { useState } from 'react';
import OverChat from './OverChat';
import { Trans } from '@lingui/react/macro';
import { MAX_MATCH_PASSWORD } from '@oss-idle/shared/multiplayer';

/** A password field over the screen: joining a locked game, or changing one's password. */
export default function PasswordPrompt({ title, sub, confirmLabel, onSubmit, onClose }: {
	title: string,
	sub?: string,
	confirmLabel: string,
	onSubmit: (password: string) => void,
	onClose: () => void,
}) {
	const [password, setPassword] = useState('');
	return (
		<OverChat><div className="ctxmenu mp-create">
			<div className="ctxmenu__header">
				<div className="ctxmenu__title">{title}</div>
				{sub && <div className="ctxmenu__sub">{sub}</div>}
			</div>
			<div className="mp-create__form">
				<label className="mp-create__label" htmlFor="mp-password-prompt"><Trans>Password:</Trans></label>
				<input
					id="mp-password-prompt"
					className="mp-input"
					type="password"
					value={password}
					maxLength={MAX_MATCH_PASSWORD}
					autoFocus
					onChange={e => setPassword(e.target.value)}
					onKeyDown={e => { if (e.key === 'Enter') onSubmit(password); }}
				/>
			</div>
			<div className="ctxmenu__options">
				<button
					type="button"
					className="ctxmenu__option"
					style={{ '--accent': '#5aa02c' } as React.CSSProperties}
					onClick={() => onSubmit(password)}
				>
					1. {confirmLabel}
				</button>
				<button
					type="button"
					className="ctxmenu__option"
					style={{ '--accent': '#6b6b6b' } as React.CSSProperties}
					onClick={onClose}
				>
					2. <Trans>Cancel</Trans>
				</button>
			</div>
		</div></OverChat>
	);
}
