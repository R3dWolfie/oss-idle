import { createFileRoute } from '@tanstack/react-router';
import { msg } from '@lingui/core/macro';
import LegalDocument from '../../pages/legal/LegalDocument';
import { notice } from '../../pages/legal/documents/notice';

export const Route = createFileRoute('/legal/notice')({
	component: () => <LegalDocument doc={notice} />,
	staticData: { title: msg`legal notice` },
});
