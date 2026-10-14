import { createFileRoute } from '@tanstack/react-router';
import { msg } from '@lingui/core/macro';
import DiscordLinked from '../../pages/DiscordLinked';

export const Route = createFileRoute('/auth/discord')({
	component: DiscordLinked,
	staticData: { title: msg`Discord linked` },
});
