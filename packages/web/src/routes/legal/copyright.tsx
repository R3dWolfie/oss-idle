import { createFileRoute } from '@tanstack/react-router';
import { msg } from '@lingui/core/macro';
import LegalDocument from '../../pages/legal/LegalDocument';
import { copyright } from '../../pages/legal/documents/copyright';

export const Route = createFileRoute('/legal/copyright')({
	component: () => <LegalDocument doc={copyright} />,
	staticData: { title: msg`copyright` },
});
