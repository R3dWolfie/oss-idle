import { createFileRoute } from '@tanstack/react-router';
import { msg } from '@lingui/core/macro';
import MapClaims from '../../pages/beatmaps/MapClaims';

export const Route = createFileRoute('/maps/claim')({
	component: MapClaims,
	staticData: { title: msg`claim your proposals` },
});
