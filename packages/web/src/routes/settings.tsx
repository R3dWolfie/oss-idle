import { createFileRoute } from '@tanstack/react-router';
import { msg } from '@lingui/core/macro';
import Settings from '../pages/settings/Settings';

export const Route = createFileRoute('/settings')({
	component: Settings,
	staticData: { title: msg`settings` },
});
