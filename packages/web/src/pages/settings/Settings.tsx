import './Settings.css';
import { Trans } from '@lingui/react/macro';
import { useCurrentCharacter } from '../../hooks/useCurrentCharacter';
import TitleSettings from './TitleSettings';
import OAuthSettings from './OAuthSettings';

/** osu!web's account settings: one section per row, its name on the left. */
export default function Settings() {
	const character = useCurrentCharacter();
	if (!character) {
		return <div className='page-contents'><Trans>Sign in to change your settings.</Trans></div>;
	}

	return <div className='settings'>
		<div className='settings__section'>
			<div className='settings__name'><Trans>Title</Trans></div>
			<div className='settings__body'>
				<TitleSettings id={String(character.id)} />
			</div>
		</div>
		<div className='settings__section'>
			<div className='settings__name'><Trans>OAuth</Trans></div>
			<div className='settings__body'>
				<OAuthSettings />
			</div>
		</div>
	</div>;
}
