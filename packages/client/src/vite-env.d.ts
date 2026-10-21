/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Base URL of the oss!idle backend. */
	readonly VITE_API_URL?: string
	/** Edges nearer some players, comma-separated: the game measures and picks. */
	readonly VITE_API_EDGES?: string
	/** Where the game and the web platform are served (the desktop app runs on app://). */
	readonly VITE_SITE_URL?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}

declare module '*.wasm?url' {
	const url: string;
	export default url;
}

// `.po` catalogs are compiled to a `messages` export by @lingui/vite-plugin.
declare module '*.po' {
	import type { Messages } from '@lingui/core';
	export const messages: Messages;
}
