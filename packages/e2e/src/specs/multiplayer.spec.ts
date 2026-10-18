import type { Page } from '@playwright/test';
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
 * osu!'s lobby and match setup, between two signed-in test accounts: one hosts,
 * the other finds the game in the lobby and joins it.
 */

/** Main menu → Play → Multi. */
const toLobby = async (page: Page): Promise<Game> => {
	const game = new Game(page);
	await game.openMenu();
	await page.locator('.menu__logo-enter').click();
	await game.menuOption('Play').click();
	await game.menuOption('Multi').click();
	// an earlier test's match can still hold the seat until its sweep
	await expect.poll(() => game.scene()).toMatch(/LOBBY|MATCH/);
	const leave = page.locator('.mp-action', { hasText: 'Leave Match' });
	if (await game.scene() === 'MATCH') await leave.click();
	await game.expectScene('LOBBY');
	return game;
};

const slot = (page: Page, name: string) => page.locator('.mp-slot', { hasText: name });

test.describe('multiplayer', () => {
	let alice: Account;
	let bob: Account;

	test.beforeEach(async () => {
		[alice, bob] = await testAccounts('multiplayer');
	});

	/** Alice hosts a game, Bob joins it from the lobby list. */
	const gather = async (playerAs: (account: Account) => Promise<Page>) => {
		const a = await playerAs(alice);
		const b = await playerAs(bob);
		const host = await toLobby(a);
		await a.locator('.mp-action', { hasText: 'New Game' }).click();
		// a match an earlier test left can linger while its seats time out
		const name = `e2e game ${Date.now()}`;
		await a.locator('#mp-name').fill(name);
		await a.locator('.mp-create .ctxmenu__option', { hasText: 'Start Game' }).click();
		await host.expectScene('MATCH');
		await expect(slot(a, alice.name)).toHaveClass(/is-self/);

		const guest = await toLobby(b);
		await b.locator('.mp-row', { hasText: name }).click();
		await guest.expectScene('MATCH');
		await expect(slot(a, bob.name)).toBeVisible();
		await expect(slot(b, alice.name)).toBeVisible();
		return {
			a, b, host, guest, name,
		};
	};

	test('a hosted game shows in the lobby, and joining seats the player', async ({ playerAs }) => {
		const { a, b, name } = await gather(playerAs);

		await b.locator('.mp-action', { hasText: 'Leave Match' }).click();
		await expect(slot(a, bob.name)).toHaveCount(0);
		await a.locator('.mp-action', { hasText: 'Leave Match' }).click();
		await expect(b.locator('.mp-row', { hasText: name })).toHaveCount(0);
	});

	test('a seated player cannot start a play of their own', async ({ playerAs }) => {
		const { b, guest } = await gather(playerAs);
		const { version } = await guest.easiestMap();
		// what the queue would send if it chained a map while seated
		const status = await b.evaluate(async beatmapId => new Promise<string>(resolve => {
			const ws = new WebSocket(`${location.origin.replace('http', 'ws')}/v1/ws`);
			ws.onopen = () => ws.send(JSON.stringify({
				type: 'play:start', beatmapId, 
			}));
			ws.onmessage = e => {
				const msg = JSON.parse(String(e.data)) as { type: string, result?: { status: string } };
				if (msg.type === 'play:start') resolve(msg.result!.status);
			};
		}), version.id);
		expect(status).toBe('inMatch');
	});

	test('the match chat reaches its players', async ({ playerAs }) => {
		const { a, b, host } = await gather(playerAs);
		await host.say('glhf from the e2e suite');
		await expect(b.locator('.chat__line', { hasText: 'glhf from the e2e suite' })).toBeVisible();
		await expect(a.locator('.chat__line', { hasText: 'glhf from the e2e suite' })).toBeVisible();
	});

	test('the host hands host over from the seat menu', async ({ playerAs }) => {
		const { a, b } = await gather(playerAs);
		await slot(a, bob.name).locator('.mp-slot__name').click();
		await a.locator('.ctxmenu__option', { hasText: 'Give Host' }).click();
		// the new host's seat menu offers what only a host has
		await slot(b, alice.name).locator('.mp-slot__name').click();
		await expect(b.locator('.ctxmenu__option', { hasText: 'Kick' })).toBeVisible();
	});

	/** The host picks a map both players have, and starts the round. */
	const startRound = async (
		{
			a, b, host, guest,
		}: Awaited<ReturnType<typeof gather>>,
		pick: Awaited<ReturnType<Game['easiestMap']>>,
	) => {
		const { set, version } = pick;
		await Promise.all([host.install(set.id), guest.install(set.id)]);

		await a.locator('.mp-setup__row', { hasText: 'Beatmap' }).locator('.mp-link').click();
		await host.expectScene('SELECT');
		// the match chat covers the bottom of the carousel, and the playfield's skip
		await a.locator('.community-controls button', { hasText: 'Hide chat' }).click();
		await host.search(set.title);
		await host.selectCard(version.id);
		// the second click on the selected card picks it, once the library has it
		await expect(async () => {
			await host.card(version.id).click();
			expect(await host.scene()).toBe('MATCH');
		}).toPass({ timeout: 30_000 });

		await b.locator('.community-controls button', { hasText: 'Hide chat' }).click();
		await b.locator('.mp-action', { hasText: 'Ready!' }).click();
		await a.locator('.mp-action', { hasText: 'Ready!' }).click();
		await a.locator('.mp-action', { hasText: 'Start Game!' }).click();
		await Promise.all([host.expectScene('GAME'), guest.expectScene('GAME')]);
	};

	test('starting the game puts every player with the map in a play', async ({ playerAs }) => {
		const players = await gather(playerAs);
		const { a, b, host, guest } = players;
		const pick = await host.easiestMap();
		await startRound(players, pick);
		expect((await host.waitForPlay()).beatmapId).toBe(pick.version.id);
		expect((await guest.waitForPlay()).beatmapId).toBe(pick.version.id);

		// a play left running would be spectated by the next test's client
		for (const [page, game] of [[a, host], [b, guest]] as const) {
			await page.locator('.play__abort').click();
			await page.locator('.ctxmenu__option', { hasText: 'Abort' }).first().click();
			await game.waitForNoPlay();
		}
	});

	test('a failed round still opens every player\'s result', async ({ playerAs }) => {
		const players = await gather(playerAs);
		const { a, b, host, guest } = players;
		// a fresh character fails anything demanding
		await startRound(players, await host.hardestMap());
		// a failed play ends where it failed, within seconds here
		await Promise.all([host.expectScene('RESULT', 90_000), guest.expectScene('RESULT', 90_000)]);

		await expect(a.locator('.mp-winner')).toBeVisible({ timeout: 30_000 });
		const theirs = a.locator('.mp-score', { hasText: bob.name });
		await expect(theirs).toHaveClass(/is-failed/);
		await theirs.click();
		await expect(a.getByText(`Played by ${bob.name}`)).toBeVisible();
		await expect(b.locator('.mp-score', { hasText: alice.name })).toBeEnabled();
	});

	test('each player plays at their own rate, and whoever is done waits for the round', async ({
		playerAs,
	}) => {
		await query('UPDATE `character` SET speed_upgrades = 10 WHERE id = ?', [alice.characterId]);
		const players = await gather(playerAs);
		const { a, b, host, guest } = players;
		await a.evaluate(() => window.__idle!.setSetting('rate', 1.5));
		await expect(slot(b, alice.name).locator('.mp-slot__rate')).toHaveText('x1.5');

		await startRound(players, await host.easiestMap());
		const [fast, slow] = await Promise.all([host.waitForPlay(), guest.waitForPlay()]);
		expect(fast.rate).toBe(1.5);
		expect(slow.rate).toBe(1);
		expect(fast.endsAt - fast.startedAt).toBeLessThan(slow.endsAt - slow.startedAt);

		// the match chat comes back with the match screen, over the skip
		const hideChat = a.locator('.community-controls button', { hasText: 'Hide chat' });
		if (await hideChat.count()) await hideChat.click();
		await host.skipToEnd();
		await expect(a.locator('.mp-round-waiting')).toBeVisible();
		await host.expectScene('GAME');

		await b.locator('.play__abort').click();
		await b.locator('.ctxmenu__option', { hasText: 'Abort' }).first().click();
		await host.expectScene('RESULT', 30_000);
		await a.evaluate(() => window.__idle!.setSetting('rate', 1));
	});
});
