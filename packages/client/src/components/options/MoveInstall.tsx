import {
	Trans,
	useLingui,
} from '@lingui/react/macro';
import { desktop } from '@oss-idle/shared/desktop';
import Log from '@oss-idle/shared/helpers/log';
import Button from './controls/Button';

export default function MoveInstall() {
	const { t } = useLingui();
	const moveInstall = desktop()?.moveInstall;
	if (!moveInstall) return <></>;

	const click = () => void moveInstall(t`Choose where to move oss!idle (the game will restart)`)
		.then(result => {
			if (result === 'inside') Log.errorPopup(t`Pick a folder outside the current installation.`);
			else if (result === 'not-empty') {
				Log.errorPopup(t`That folder already has an oss!idle folder with files in it.`);
			}
			else if (result === 'not-writable') Log.errorPopup(t`oss!idle can't write to that folder.`);
		})
		.catch((e) => Log.errorPopup(String(e)));

	return <Button onClick={click} label={<Trans>Move installation...</Trans>} />;
}
