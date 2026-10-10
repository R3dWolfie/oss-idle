import {
	useEffect,
	useState,
} from 'react';
import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import Synced from '@osu-idle/shared/helpers/synced';
import {
	MAX_MATCH_NAME,
	type Match,
} from '@osu-idle/shared/multiplayer';
import Checkbox from '../options/controls/Checkbox';
import Dropdown from '../dropdown/Dropdown';
import MatchBeatmap from './MatchBeatmap';
import PasswordPrompt from './PasswordPrompt';
import Multiplayer from '../../online/multiplayer';

// osu!idle has no mods, teams or win conditions yet: shown, with only the default
const freeMods = new Synced(false);
const teamMode = new Synced('head-to-head');
const winCondition = new Synced('score');

/** The right half of match setup: name, map and rules, editable by the host. */
export default function MatchSettings({ match }: { match: Match }) {
	const { t } = useLingui();
	const [name, setName] = useState(match.name);
	const [changingPassword, setChangingPassword] = useState(false);
	const host = Multiplayer.isHost(match);

	useEffect(() => setName(match.name), [match.name]);

	const rename = () => {
		const trimmed = name.trim();
		if (host && trimmed && trimmed !== match.name) Multiplayer.send({
			type: 'mp:settings', name: trimmed,
		});
	};

	return (
		<div className="mp-setup__settings">
			<div className="mp-setup__row">
				<h2 className="mp-setup__heading"><Trans>Game Name</Trans></h2>
				{host && (
					<button type="button" className="mp-link" onClick={() => setChangingPassword(true)}>
						<Trans>Change Password...</Trans>
					</button>
				)}
			</div>
			<input
				className="mp-input mp-setup__name"
				value={name}
				maxLength={MAX_MATCH_NAME}
				readOnly={!host}
				onChange={e => setName(e.target.value)}
				onBlur={rename}
				onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
			/>

			<div className="mp-setup__row">
				<h2 className="mp-setup__heading"><Trans>Beatmap</Trans></h2>
				{host && !match.playing && (
					<button type="button" className="mp-link" onClick={() => Multiplayer.pickBeatmap()}>
						<Trans>Change...</Trans>
					</button>
				)}
			</div>
			<MatchBeatmap match={match} noMap={!!Multiplayer.mySlot(match)?.noMap} />

			<div className="mp-setup__row">
				<h2 className="mp-setup__heading"><Trans>Mods</Trans></h2>
				{host && <button type="button" className="mp-link" disabled><Trans>Change...</Trans></button>}
				{host && <Checkbox value={freeMods} label={<Trans>Free Mods</Trans>} />}
			</div>
			<div className="mp-setup__option">
				<span><Trans>Team Mode:</Trans></span>
				<Dropdown value={teamMode} options={[{
					value: 'head-to-head', label: t`Head-to-head`,
				}]} />
			</div>
			<div className="mp-setup__option">
				<span><Trans>Win Condition:</Trans></span>
				<Dropdown value={winCondition} options={[{
					value: 'score', label: t`Score`,
				}]} />
			</div>

			{changingPassword && <PasswordPrompt
				title={t`Change Password`}
				sub={t`Leave empty to remove the password.`}
				confirmLabel={t`Set Password`}
				onSubmit={password => {
					Multiplayer.send({
						type: 'mp:settings', password,
					});
					setChangingPassword(false);
				}}
				onClose={() => setChangingPassword(false)}
			/>}
		</div>
	);
}
