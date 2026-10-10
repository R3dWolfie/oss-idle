import { createFileRoute } from '@tanstack/react-router';
import { msg } from '@lingui/core/macro';
import Medals from '../../pages/admin/Medals';

export const Route = createFileRoute('/admin/medals')({
	component: Medals,
	staticData: { title: msg`medals` },
});
