import { useState } from 'react';
import { useLingui } from '@lingui/react/macro';
import useSynced from '@oss-idle/shared/hooks/useSynced';
import {
	clearOldHost,
	forgetOldHost,
	hasOldHostData,
	OLD_HOST,
} from '@oss-idle/shared/hostMove';
import SceneManager, { SCENE } from '../scenes/SceneManager';
import ConfirmMenu from './ConfirmMenu';

/** After the move from the old host, on the main menu: offer to delete what the
 *  old address still keeps in this browser, downloaded beatmaps included. */
export default function OldHostPrompt() {
	const { t } = useLingui();
	const [scene] = useSynced(SceneManager.current);
	const [open, setOpen] = useState(hasOldHostData);

	if (!open || scene !== SCENE.MENU) return null;
	return (
		<ConfirmMenu
			title={t`oss!idle moved here from ${OLD_HOST}`}
			// eslint-disable-next-line @stylistic/max-len
			sub={t`Your save, settings and session came along. Delete everything the old address still keeps in this browser, downloaded beatmaps included?`}
			confirmLabel={t`Delete the old data`}
			onConfirm={() => void clearOldHost()}
			onClose={() => {
				forgetOldHost();
				setOpen(false);
			}}
		/>
	);
}
