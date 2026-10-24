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

	test('MakiseBot answers !ping in the channel and in private, always online', async ({
		playerAs,
	}) => {
		const a = await playerAs(alice);
		const game = await inGame(a);
		await a.keyboard.press('F8');
		await game.say('!ping');
		// the channel's history may hold an earlier run's answer
		const answer = a.locator('.chat__line', { hasText: 'MakiseBot' }).last();
		await expect(answer).toContainText('pong');

		// her name opens her menu, with her roster card: she is online
		await answer.locator('.chat__name').click();
		await expect(a.locator('.player-menu__card')).toContainText('MakiseBot');
		await a.locator('.ctxmenu__option', { hasText: 'Start Chat' }).click();
		await expect(a.locator('.chat__tabs .tab', { hasText: 'MakiseBot' })).toBeVisible();
		await game.say('!ping');
		await expect(a.locator('.chat__line', { hasText: 'MakiseBot' }).last()).toContainText('pong');
	});

	test('/np links the map: song select moves to it, the menu plays it', async ({ playerAs }) => {
		const b = await playerAs(bob);
		const bobGame = await inGame(b);
		const a = await playerAs(alice);
		const game = await inGame(a);
		await game.enterSongSelect();
		const { set, version } = await game.easiestMap();
		const other = await game.hardestMap();
		await game.search(set.title);
		await game.selectCard(version.id);

		await game.fromRoster(bob.name, 'Start Chat');
		await game.say('/np');
		const link = a.locator('.chat__line .chat__link', { hasText: version.version });
		await expect(link).toBeVisible();
		// bob's popup reads like the chat line, not the link's markup
		const popup = b.locator('.popup', { hasText: alice.name });
		await expect(popup).toContainText(version.version);
		await expect(popup).not.toContainText('http');

		// song select: away from the map, then the link brings it back
		await a.keyboard.press('Escape');
		await game.search(other.set.title);
		await game.selectCard(other.version.id);
		await a.keyboard.press('F8');
		await link.click();
		await expect(a.locator('.community-chat-container')).not.toHaveClass(/is-enabled/);
		await expect.poll(() => game.nowPlaying()).toBe(version.id);

		// the main menu: the link puts it on
		await b.keyboard.press('F8');
		await b.locator('.chat__tabs .tab', { hasText: alice.name }).click();
		await b.locator('.chat__line .chat__link', { hasText: version.version }).click();
		await expect.poll(() => bobGame.nowPlaying()).toBe(version.id);
		expect(await bobGame.scene()).toBe('MENU');
	});
});
