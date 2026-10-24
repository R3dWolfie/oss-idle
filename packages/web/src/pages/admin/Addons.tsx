import './Addons.css';

import type { AddonStatus } from '@oss-idle/shared/addon';
import {
	listAddonsAdmin,
	moderateAddon,
} from '../../api/addons';
import AddonRow from './AddonRow';
import AdminList from './AdminList';

const STATUS_ORDER: Record<AddonStatus, number> = {
	published: 0, unpublished: 1,
};

export default function AddonsAdmin() {
	return (
		<AdminList
			load={listAddonsAdmin}
			statusOrder={STATUS_ORDER}
			noun='add-ons'
			renderRow={(row, busy, act) => (
				<AddonRow
					key={row.id}
					row={row}
					busy={busy}
					onModerate={(id, body) => act(() => moderateAddon(id, body))}
				/>
			)}
		/>
	);
}
