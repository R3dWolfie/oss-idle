import { createFileRoute } from '@tanstack/react-router';
import { msg } from '@lingui/core/macro';
import PlayOssIdle from '../pages/PlayOssIdle';

export const Route = createFileRoute('/download')({
	component: PlayOssIdle,
	staticData: { title: msg`play oss!idle` },
});
