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
 * Friends, private messages, block and report, between two signed-in test
 * accounts - each in its own browser context, the way two players are.
 */

/** A signed-in client sitting in the main menu, its socket up. */
const inGame = async (page: Page): Promise<Game> => {
	const game = new Game(page);
	await game.openMenu();
	return game;
};

test.describe('social', () => {
	let alice: Account;
	let bob: Account;

	test.beforeEach(async () => {
		[alice, bob] = await testAccounts('social');
	});

	test('adding a friend from their profile, mutual once they add back', async ({ playerAs }) => {
		const a = await playerAs(alice);
		await a.goto(`/web/c/${bob.characterId}`);
		const button = a.locator('.friend-button');
		await expect(button).toHaveAttribute('data-state', 'none');
		await button.click();
		await expect(button).toHaveAttribute('data-state', 'friend');

		await a.goto('/web/friends');
		const chip = a.locator('.friend-chip', { hasText: bob.name });
		await expect(chip).toHaveAttribute('data-mutual', 'false');

		const b = await playerAs(bob);
		await b.goto(`/web/c/${alice.characterId}`);
		await b.locator('.friend-button').click();
		await expect(b.locator('.friend-button')).toHaveAttribute('data-state', 'mutual');

		await a.reload();
		await expect(chip).toHaveAttribute('data-mutual', 'true');
	});

	test('a private message reaches a player who is online', async ({ playerAs }) => {
		const a = await playerAs(alice);
		const b = await playerAs(bob);
		await inGame(b);
		const game = await inGame(a);

		await game.fromRoster(bob.name, 'Start Chat');
		await game.say('hello from the e2e suite');
		await expect(a.locator('.chat__line', { hasText: 'hello from the e2e suite' })).toBeVisible();

		await b.keyboard.press('F8');
		await b.locator('.chat__tabs .tab', { hasText: alice.name }).click();
		await expect(b.locator('.chat__line', { hasText: 'hello from the e2e suite' })).toBeVisible();
	});

	test('past the rate limit, messages still look sent but stop arriving', async ({ playerAs }) => {
		const a = await playerAs(alice);
		const b = await playerAs(bob);
		await inGame(b);
		const game = await inGame(a);
		await game.fromRoster(bob.name, 'Start Chat');
		for (let i = 1; i <= 12; i++) await game.say(`burst ${i}`);
		await expect(a.locator('.chat__line', { hasText: 'burst ' })).toHaveCount(12);

		await b.keyboard.press('F8');
		await b.locator('.chat__tabs .tab', { hasText: alice.name }).click();
		await expect(b.locator('.chat__line', { hasText: 'burst 10' })).toBeVisible();
		await b.waitForTimeout(1000);
		await expect(b.locator('.chat__line', { hasText: 'burst ' })).toHaveCount(10);
	});

	test('a block stops private messages, and the sender cannot tell', async ({ playerAs }) => {
		const a = await playerAs(alice);
		const b = await playerAs(bob);
		await b.goto(`/web/c/${alice.characterId}`);
		await b.locator('.profile-menu__toggle').click();
		await b.locator('.profile-menu__item', { hasText: 'Block' }).click();
		await b.locator('.profile-menu__toggle').click();
		await expect(b.locator('.profile-menu__item', { hasText: 'Unblock' })).toBeVisible();

		await inGame(b);
		const game = await inGame(a);
		await game.fromRoster(bob.name, 'Start Chat');
		await game.say('can you read this');
		// echoed back to the sender as if delivered
		await expect(a.locator('.chat__line', { hasText: 'can you read this' })).toBeVisible();

		await b.keyboard.press('F8');
		await b.waitForTimeout(2000);
		await expect(b.locator('.chat__tabs .tab', { hasText: alice.name })).toHaveCount(0);
	});

	test('a report from the profile menu lands for the admins', async ({ playerAs }) => {
		const a = await playerAs(alice);
		await a.goto(`/web/c/${bob.characterId}`);
		await a.locator('.profile-menu__toggle').click();
		await a.locator('.profile-menu__item', { hasText: 'Report' }).click();

		const dialog = a.locator('.report-dialog');
		await dialog.locator('select').selectOption('chat');
		await dialog.locator('textarea').fill('reported by the e2e suite');
		await dialog.locator('.report-dialog__btn--send').click();
		await expect(dialog).toBeHidden();

		const rows = await query<{ reason: string }>(
			'SELECT reason FROM user_report WHERE user_id = ? AND target_id = ?', [alice.id, bob.id],
		);
		expect(rows.map(r => r.reason)).toEqual(['chat']);
	});
});
