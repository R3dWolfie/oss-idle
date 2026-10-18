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
 * Playback rates: each Speed upgrade unlocks one step faster and one slower, picked
 * from osu!'s mod select (F1). The play runs at the rate, the score keeps it.
 */
test.describe('rates', () => {
	let erin: Account;

	test.beforeEach(async () => {
		[erin] = await testAccounts('rates');
		await query('UPDATE `character` SET speed_upgrades = 10 WHERE id = ?', [erin.characterId]);
	});

	type Row = { rate: string, sr: string | null, score: number };
	const latestScore = async () => (await query<Row>(
		'SELECT rate, sr, score FROM score WHERE character_id = ? ORDER BY id DESC LIMIT 1',
		[erin.characterId],
	))[0];

	test('the mod select picks a rate, and the play runs at it', async ({ playerAs }) => {
		const page = await playerAs(erin);
		const game = new Game(page);
		await game.start();
		const { set, version } = await game.installEasiest();
		await game.search(set.title);

		await page.keyboard.press('F1');
		const double = page.locator('.mod-tile', { hasText: 'Double' });
		await double.click();
		// the wheel over the lit mod steps it, up to what is unlocked
		await double.hover();
		for (let i = 0; i < 12; i++) await page.mouse.wheel(0, -100);
		await expect(page.locator('.rate-stepper__value')).toHaveText('x1.5');
		// off and on again: the last rate comes back
		await double.click();
		await expect(page.locator('.rate-stepper__value')).toHaveCount(0);
		await double.click();
		await expect(page.locator('.rate-stepper__value')).toHaveText('x1.5');
		await page.keyboard.press('2');
		await expect(page.locator('.select-footer__active')).toHaveText('x1.5');

		await game.playCard(version.id);
		const play = await game.waitForPlay();
		expect(play.rate).toBe(1.5);
		// a third shorter than the map
		const songMs = play.endsAt - play.startedAt - 2000;
		expect(songMs).toBeLessThan(version.length / 1.5 + 3000);
		expect(songMs).toBeGreaterThan(version.length / 1.5 - 5000);

		await game.skipToEnd();
		await game.expectScene('RESULT');
		await expect(page.locator('.result__mod')).toContainText('x1.5');
		const score = await latestScore();
		expect(Number(score.rate)).toBe(1.5);
		expect(score.sr).not.toBeNull();
	});

	test('Ctrl and the keys left of Backspace step the rate', async ({ playerAs }) => {
		const page = await playerAs(erin);
		const game = new Game(page);
		await game.start();
		await page.keyboard.press('Control+Equal');
		await page.keyboard.press('Control+Equal');
		await expect(page.locator('.select-footer__active')).toHaveText('x1.1');
		for (let i = 0; i < 4; i++) await page.keyboard.press('Control+Minus');
		await expect(page.locator('.select-footer__active')).toHaveText('x0.9');
		// the cards follow the rate
		const { set, version } = await game.installEasiest();
		await game.search(set.title);
		await game.selectCard(version.id);
		await expect(page.locator('.bm-card.is-active')).toContainText(`${version.version} x0.9`);
		await page.evaluate(() => window.__idle!.setSetting('rate', 1));
	});

	test('a slowed-down play keeps x0.3 of its score', async ({ playerAs }) => {
		const page = await playerAs(erin);
		const game = new Game(page);
		await game.start();
		await page.evaluate(() => window.__idle!.setSetting('rate', 0.5));
		const { set, version } = await game.installEasiest();
		await game.search(set.title);
		await game.playCard(version.id);
		expect((await game.waitForPlay()).rate).toBe(0.5);
		await game.skipToEnd();
		await game.expectScene('RESULT');
		await expect(page.locator('.result__mod')).toContainText('x0.5');
		const score = await latestScore();
		expect(Number(score.rate)).toBe(0.5);
		expect(score.score).toBeLessThanOrEqual(300_000);
		await page.evaluate(() => window.__idle!.setSetting('rate', 1));
	});
});
