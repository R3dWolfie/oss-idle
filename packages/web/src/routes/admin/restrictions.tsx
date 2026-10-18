import { createFileRoute } from '@tanstack/react-router';
import { msg } from '@lingui/core/macro';
import Restrictions from '../../pages/admin/Restrictions';

export const Route = createFileRoute('/admin/restrictions')({
	component: Restrictions,
	staticData: { title: msg`restricted accounts` },
});
