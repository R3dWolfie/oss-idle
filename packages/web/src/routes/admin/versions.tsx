import { createFileRoute } from '@tanstack/react-router';
import { msg } from '@lingui/core/macro';
import Versions from '../../pages/admin/Versions';

export const Route = createFileRoute('/admin/versions')({
	component: Versions,
	staticData: { title: msg`version adoption` },
});
