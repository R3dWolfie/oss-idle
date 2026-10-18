import { createFileRoute } from '@tanstack/react-router';
import { msg } from '@lingui/core/macro';
import LegalDocument from '../../pages/legal/LegalDocument';
import { api } from '../../pages/legal/documents/api';

export const Route = createFileRoute('/legal/api')({
	component: () => <LegalDocument doc={api} />,
	staticData: { title: msg`API terms of use` },
});
