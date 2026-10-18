import { createFileRoute } from '@tanstack/react-router';
import { msg } from '@lingui/core/macro';
import LegalDocument from '../../pages/legal/LegalDocument';
import { privacy } from '../../pages/legal/documents/privacy';

export const Route = createFileRoute('/legal/privacy')({
	component: () => <LegalDocument doc={privacy} />,
	staticData: { title: msg`privacy` },
});
