import { readFileSync } from 'node:fs';
import {
	expect,
	test,
} from '../support/fixtures';
import Game from '../support/game';
import {
	query,
	testAccounts,
	type Account,
} from '../support/accounts';

/**
 * Add-on types: Gameplay unless the author picks Editor (or both), and the
 * catalog filtered on them.
 */
test.describe('add-on types', () => {
	let grace: Account;
	const name = `e2e types ${Date.now()}`;
	// apart from `name`: the type listings of the test beside it search by that
	const api = `e2e editor api ${Date.now()}`;
	const made: number[] = [];

	test.beforeAll(async () => {
		[grace] = await testAccounts('editor');
	});

	test.afterAll(async () => {
		if (!made.length) return;
		await query(`DELETE FROM addons WHERE id IN (${made.map(() => '?').join(',')})`, made);
	});

	test('an add-on is Gameplay by default, Editor when picked, and the catalog filters on it', async ({
		playerAs,
	}) => {
		const page = await playerAs(grace);
		const create = async (suffix: string, types?: string[]) => {
			const response = await page.request.post('/v1/addons', {
				data: {
					name: `${name} ${suffix}`, ...types ? { types } : {},
				},
			});
			expect(response.status()).toBe(201);
			const addon = await response.json() as { id: number, types: string[] };
			made.push(addon.id);
			return addon;
		};
		expect((await create('play')).types).toEqual(['gameplay']);
		expect((await create('edit', ['editor'])).types).toEqual(['editor']);
		const refused = await page.request.post('/v1/addons', {
			data: {
				name: `${name} none`, types: [],
			},
		});
		expect(refused.status()).toBe(400);

		// published by hand: the daily publish cap is not what this is about
		await query('UPDATE addons SET status = \'published\' WHERE id IN (?, ?)', made);
		const listed = async (type?: string) => {
			const params = new URLSearchParams({
				q: name, ...type ? { type } : {},
			});
			const list = await (await page.request.get(`/v1/addons?${params}`)).json() as { name: string }[];
			return list.map(addon => addon.name).sort();
		};
		expect(await listed()).toEqual([`${name} edit`, `${name} play`]);
		expect(await listed('editor')).toEqual([`${name} edit`]);
		expect(await listed('gameplay')).toEqual([`${name} play`]);

		// the browse page's type pills
		const game = new Game(page);
		await game.start();
		await page.keyboard.press('Control+Shift+O');
		await page.locator('.options__search_input').fill('browse');
		await page.getByRole('button', { name: 'Browse add-ons' }).click();
		const card = (suffix: string) => page.locator('.listing', { hasText: `${name} ${suffix}` });
		await page.locator('.listings__search').fill(name);
		await page.locator('.listings__search').press('Enter');
		await expect(card('play')).toBeVisible();
		await expect(card('edit')).toBeVisible();
		await page.locator('.addon-types').getByRole('button', { name: 'Editor' }).click();
		await expect(card('play')).toHaveCount(0);
		await expect(card('edit')).toBeVisible();
		await expect(card('edit').locator('.addon-type', { hasText: 'Editor' })).toBeVisible();
	});

	test('the editor API sampler: a tab, a panel, actions, a window, and every call', async ({
		playerAs,
	}) => {
		const page = await playerAs(grace);
		// one file, no imports: the editor API and React come from the host
		const source = readFileSync(new URL('../../addons/editor-sampler.js', import.meta.url), 'utf8');
		const response = await page.request.post('/v1/addons', {
			data: {
				name: api, types: ['editor'], source,
			},
		});
		expect(response.status()).toBe(201);
		const { id } = await response.json() as { id: number };
		made.push(id);
		await query('UPDATE addons SET status = \'published\' WHERE id = ?', [id]);

		const game = new Game(page);
		await game.start();
		await page.keyboard.press('Control+Shift+O');
		await page.locator('.options__search_input').fill('browse');
		await page.getByRole('button', { name: 'Browse add-ons' }).click();
		await page.locator('.listings__search').fill(api);
		await page.locator('.listings__search').press('Enter');
		const card = page.locator('.listing', { hasText: api });
		await card.getByRole('button', { name: 'Install' }).click();
		await page.getByRole('button', {
			name: 'Install', exact: true,
		}).last().click();
		await expect(card).toContainText('Installed');
		await page.keyboard.press('Escape');

		await game.newMap('Addon.wav');

		// an action on its default key, the tab's read-out following
		await page.locator('.editor__tabs button', { hasText: 'API sampler' }).click();
		const readout = page.locator('.sampler-readout');
		await expect(readout).toContainText('4K · 0 notes');
		await page.keyboard.press('Control+Alt+n');
		await expect(readout).toContainText('4K · 1 notes · 1 selected');
		await expect(page.locator('.editor__counts')).toHaveAttribute('data-notes', '1');
		await page.keyboard.press('Control+z');
		await expect(readout).toContainText('4K · 0 notes');

		// every call, each change undone after
		await page.getByRole('button', { name: 'Run every check' }).click();
		await expect(page.locator('.sampler-summary')).toHaveText(/^all \d+ passed$/);
		await expect(readout).toContainText('4K · 0 notes');

		// the panel ticks; the window, opened from Ctrl+K, draws with the game's React
		await expect(page.locator('.sampler-time')).toContainText('0:00');
		await page.keyboard.press('Control+k');
		await page.keyboard.type('Sampler: open');
		await page.keyboard.press('Enter');
		await expect(page.locator('.editor__addon-window-bar')).toContainText('API sampler');
		await expect(page.locator('.sampler-window__notes')).toHaveText('0 notes, 0 selected');
		await page.getByRole('button', { name: 'Note here' }).click();
		await expect(page.locator('.sampler-window__notes')).toHaveText('1 notes, 1 selected');
		// opened again, it is still the one window, which its Close button closes
		await page.getByRole('button', {
			name: 'Open', exact: true, 
		}).click();
		await expect(page.locator('.editor__addon-window')).toHaveCount(1);
		await page.locator('.editor__tab-body').getByRole('button', {
			name: 'Close', exact: true, 
		}).click();
		await expect(page.locator('.editor__addon-window')).toHaveCount(0);
		await page.getByRole('button', {
			name: 'Open', exact: true, 
		}).click();
		await page.locator('.editor__addon-window').getByRole('button', { name: 'Close' }).click();
		await expect(page.locator('.editor__addon-window')).toHaveCount(0);
	});
});
