import { createFileRoute } from '@tanstack/react-router';
import { msg } from '@lingui/core/macro';
import Docs from '../pages/docs/Docs';

export const Route = createFileRoute('/docs')({
	component: Docs,
	staticData: { title: msg`API documentation` },
});
