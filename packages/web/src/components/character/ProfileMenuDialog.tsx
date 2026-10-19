import RestrictDialog from './RestrictDialog';
import SilenceDialog from './SilenceDialog';
import DeleteAccountDialog from './DeleteAccountDialog';
import ReportDialog from './ReportDialog';

export type ProfileDialog = 'report' | 'silence' | 'restrict' | 'delete';

const reload = () => window.location.reload();

/** The dialog a profile ⋮ menu item opened. */
export default function ProfileMenuDialog({ dialog, userId, name, onClose }: {
	dialog: ProfileDialog;
	userId: number;
	name: string;
	onClose: () => void;
}) {
	switch (dialog) {
		case 'report':
			return <ReportDialog userId={userId} name={name} onClose={onClose} />;
		case 'silence':
			return <SilenceDialog userId={userId} name={name} onDone={reload} onClose={onClose} />;
		case 'restrict':
			return <RestrictDialog userId={userId} name={name} onDone={reload} onClose={onClose} />;
		case 'delete':
			return <DeleteAccountDialog
				userId={userId}
				onDone={() => window.location.assign('/web/')}
				onClose={onClose}
			/>;
	}
}
