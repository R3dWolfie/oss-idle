import './Changelog.css';
import { useEffect } from 'react';
import { useLingui } from '@lingui/react/macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileLines } from '@fortawesome/free-solid-svg-icons/faFileLines';
import Log, { POPUP_TYPE } from '@oss-idle/shared/helpers/log';
import { VERSION } from '@oss-idle/shared/version';
import { SETTINGS } from '../db/settings';
import {
	isWebOpen,
	webUrl,
} from '../globals';

/** The changelog, in the in-game web browser. */
const openChangelog = () => {
	void webUrl.set('changelog');
	void isWebOpen.set(true);
};

/** Main menu changelog button, next to the Discord logo. After an update it also
 *  pops "oss!idle updated" once, which opens the changelog. A first run stays quiet. */
export default function Changelog() {
	const { t } = useLingui();

	useEffect(() => {
		if (SETTINGS.lastVersion.get() === VERSION) return;
		// once the menu has settled (the popup overlay mounts after the scene, too)
		const timer = window.setTimeout(() => {
			const last = SETTINGS.lastVersion.get();
			void SETTINGS.lastVersion.set(VERSION);
			if (!last) return;
			Log.popup(
				t`oss!idle updated to v${VERSION}, see what's new`, POPUP_TYPE.good, false, openChangelog,
			);
		}, 1200);
		return () => clearTimeout(timer);
	}, [t]);

	return <button
		className='changelog-button'
		onClick={openChangelog}
		aria-label={t`Changelog`}
	>
		<FontAwesomeIcon icon={faFileLines} />
		<span className='changelog-button__tip'>{t`What's new`}</span>
	</button>;
}
