import {
	devTools,
	type DevTool,
} from './devTools';

/**
 * Staging only: the screen before the game loads, picking which dev tools run.
 * Plain DOM, since React isn't up yet. The last picks are remembered.
 */

const PICKS_KEY = 'dev-tools';

const TOOLS: [DevTool, string, string][] = [
	['profiler', 'Profiler', 'Frame profiler: Ctrl+F11 overlay, Ctrl+Alt+F11 sends a report'],
	['debug', 'Debug mode', 'Debug plays, strain debug, gameplay debug controls, XP multiplier'],
	['playground', 'Playground', 'The component bench instead of the game'],
	['testBridge', 'Test bridge', 'window.__idle, the e2e suite\'s handle'],
];

const readPicks = (): Partial<Record<DevTool, boolean>> => {
	try {
		return JSON.parse(localStorage.getItem(PICKS_KEY) ?? '{}');
	} catch {
		return {};
	}
};

const option = ([tool, label, hint]: typeof TOOLS[number], checked: boolean) => {
	const row = document.createElement('label');
	row.style.cssText = 'display:flex;gap:10px;align-items:baseline;padding:6px 0;cursor:pointer';
	const box = document.createElement('input');
	box.type = 'checkbox';
	box.name = tool;
	box.checked = checked;
	const text = document.createElement('span');
	text.innerHTML = `<b>${label}</b> <span style="opacity:.6">${hint}</span>`;
	row.append(box, text);
	return row;
};

export function chooseDevTools(): Promise<void> {
	const picks = readPicks();
	const form = document.createElement('form');
	form.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column;'
		+ 'justify-content:center;padding:0 max(24px,calc(50vw - 260px));'
		+ 'background:#05040a;color:#fff;font:15px system-ui,sans-serif;z-index:1';
	form.innerHTML = '<h2 style="margin:0 0 12px">oss!idle staging: dev tools</h2>';
	form.append(...TOOLS.map(tool => option(tool, !!picks[tool[0]])));
	const start = document.createElement('button');
	start.textContent = 'Start';
	start.style.cssText = 'margin-top:16px;align-self:flex-start;padding:8px 24px;font:inherit';
	form.append(start);
	document.body.append(form);
	start.focus();

	return new Promise(resolve => form.addEventListener('submit', e => {
		e.preventDefault();
		for (const [tool] of TOOLS) {
			devTools[tool] = (form.elements.namedItem(tool) as HTMLInputElement).checked;
		}
		try { localStorage.setItem(PICKS_KEY, JSON.stringify(devTools)); } catch { /* private mode */ }
		form.remove();
		resolve();
	}));
}
