import { ph } from '@lingui/core/macro';
import { useState } from 'react';
import OverChat from './OverChat';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import Synced from '@osu-idle/shared/helpers/synced';
import useSynced from '@osu-idle/shared/hooks/useSynced';
import {
	MAX_MATCH_NAME,
	MAX_MATCH_PASSWORD,
	MAX_SLOTS,
	MIN_SLOTS,
} from '@osu-idle/shared/multiplayer';
import Log from '@osu-idle/shared/helpers/log';
import Checkbox from '../options/controls/Checkbox';
import Dropdown from '../dropdown/Dropdown';
import Entities from '../../entity/entities';
import Multiplayer from '../../online/multiplayer';
import SceneManager, { SCENE } from '../../scenes/SceneManager';

const SIZES = Array.from({ length: MAX_SLOTS - MIN_SLOTS + 1 }, (_, i) => i + MIN_SLOTS);

/** osu!'s "Create New Game..." dialog, over the lobby. */
export default function CreateMatch({ onClose }: { onClose: () => void }) {
	const { t } = useLingui();
	const [name, setName] = useState(() =>
		t`${ph({ name: Entities.character.get()?.name ?? '' })}'s game`);
	const [password, setPassword] = useState('');
	const [usePassword] = useState(() => new Synced(false));
	const [isPublic] = useState(() => new Synced(true));
	const [size] = useState(() => new Synced(8));
	const [locked] = useSynced(usePassword);

	// only a password-protected game may keep its history to its players
	const start = async () => {
		if (!name.trim()) return;
		if (locked && !password) {
			Log.popup(t`Enter a password before attempting to start the game...`);
			return;
		}
		const historyPublic = !locked || isPublic.get();
		await Multiplayer.create(name.trim(), locked ? password : '', size.get(), historyPublic);
		SceneManager.set(SCENE.MATCH);
	};

	return (
		<OverChat><div className="ctxmenu mp-create">
			<div className="ctxmenu__header"><Trans>Create New Game...</Trans></div>
			<div className="mp-create__form">
				<label className="mp-create__label" htmlFor="mp-name"><Trans>Game Name:</Trans></label>
				<input
					id="mp-name"
					className="mp-input"
					value={name}
					maxLength={MAX_MATCH_NAME}
					autoFocus
					onChange={e => setName(e.target.value)}
				/>
				<div className="mp-create__checks">
					<Checkbox value={usePassword} label={<Trans>Require password to join</Trans>} />
					<Checkbox
						value={isPublic}
						disabled={!locked}
						label={<Trans>Make match history publicly viewable</Trans>}
					/>
				</div>
				<label className="mp-create__label" htmlFor="mp-password"><Trans>Password:</Trans></label>
				<input
					id="mp-password"
					className="mp-input"
					type="password"
					value={password}
					maxLength={MAX_MATCH_PASSWORD}
					disabled={!locked}
					onChange={e => setPassword(e.target.value)}
				/>
				<span className="mp-create__label"><Trans>Max Players:</Trans></span>
				<Dropdown
					className="mp-create__size"
					value={size}
					options={SIZES.map(n => ({
						value: n, label: t`${n} players`,
					}))}
				/>
			</div>
			<div className="ctxmenu__options">
				<button
					type="button"
					className="ctxmenu__option"
					style={{ '--accent': '#5aa02c' } as React.CSSProperties}
					onClick={() => void start()}
				>
					1. <Trans>Start Game</Trans>
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
