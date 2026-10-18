import { createFileRoute } from '@tanstack/react-router';
import { msg } from '@lingui/core/macro';
import LegalDocument from '../../pages/legal/LegalDocument';
import { terms } from '../../pages/legal/documents/terms';

export const Route = createFileRoute('/legal/terms')({
	component: () => <LegalDocument doc={terms} />,
	staticData: { title: msg`terms` },
});
