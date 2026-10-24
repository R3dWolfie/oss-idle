import {
	ADDON_BUILD_STATUS,
	ADDON_KIND,
	ADDON_STATUS,
} from '@oss-idle/shared/addon';
import type { OwnAddon } from '../online/addons';

/** A published repo add-on whose newest build failed. */
export const sampleRepoAddon = (): OwnAddon => ({
	id: 1,
	authorId: 1,
	authorName: 'Adri',
	name: 'oss!idle sim',
	description: 'Simulates your character on every downloaded map to rank farm value.',
	tags: ['sim', 'playlists'],
	types: ['gameplay'],
	icon: null,
	version: '0.8.1',
	gameVersion: '1.0.3.0',
	source: 'export const mount = () => {};',
	status: ADDON_STATUS.published,
	downloads: 42,
	createdAt: new Date(0).toISOString(),
	updatedAt: new Date(0).toISOString(),
	publishedAt: new Date(0).toISOString(),
	kind: ADDON_KIND.repo,
	repoUrl: 'https://github.com/oss-idle/addon-sim',
	commit: 'f3af4c7d1e2a9b8c7d6e5f4a3b2c1d0e9f8a7b6c',
	tag: 'v0.8.1',
	buildStatus: ADDON_BUILD_STATUS.failed,
	buildLog: '$ npm run build\n> oss-idle-sim@0.9.0 build\nError: Cannot find module \'./vendor/sim\'\nexited with 1',
	hookUrl: 'https://api.oss.idle.rhythmgamers.net/v1/addons/1/hook/0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c4b5a6978',
});
