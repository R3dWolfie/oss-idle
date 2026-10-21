/** A staging build (`vite build --mode staging`): release code, plus the dev tools
 *  its startup menu picks. */
export const STAGING = import.meta.env.MODE === 'staging';

/** Gates every dev tool on a build-time constant, so a release build drops them. */
export const DEV_TOOLS = import.meta.env.DEV || import.meta.env.MODE === 'staging';

/** Which dev tools run: all of them in dev, the startup menu's picks in staging. */
export const devTools = {
	profiler: import.meta.env.DEV,
	debug: import.meta.env.DEV,
	playground: import.meta.env.DEV,
	testBridge: import.meta.env.DEV,
};

export type DevTool = keyof typeof devTools;
