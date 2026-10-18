import { createFileRoute } from '@tanstack/react-router';
import { msg } from '@lingui/core/macro';
import LegalDocument from '../../pages/legal/LegalDocument';
import { rules } from '../../pages/legal/documents/rules';

export const Route = createFileRoute('/legal/rules')({
	component: () => <LegalDocument doc={rules} />,
	staticData: { title: msg`rules` },
});
