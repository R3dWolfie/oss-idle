import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import {
	strFromU8,
	unzipSync,
} from 'fflate';
import {
	expect,
	test,
} from '../support/fixtures';
import type Game from '../support/game';
import { clicks } from '../support/files';

/** The default skin's 4K column width (in its 480-high space) at the field's height, and
 *  the gap before the live preview's field. */
const columnWidth = (box: { height: number }) => 33 * box.height / 480;
const PREVIEW_GAP = 60;

/** The middle of a 4K column of the editor's field, which the live preview (on by
 *  default) pushes left of centre. */
const columnX = (
	box: { x: number, width: number, height: number }, column: number, preview = true,
) => {
	const cw = columnWidth(box);
	const fields = preview ? cw * 8 + PREVIEW_GAP : cw * 4;
	return box.x + (box.width - fields) / 2 + cw * (column + 0.5);
};


/**
 * Main menu → Editor → Select → the map's card, clicked again once selected.
 * Like a play, the click only opens once the card is backed by the downloaded
 * map, so it clicks until the editor is up.
 */
const openEditor = async (game: Game, title: string, diffId: number) => {
	await game.page.locator('.menu__logo-enter').click();
	await game.menuOption('Editor').click();
	await game.menuOption('Select').click();
	await game.expectScene('SELECT');
	await game.search(title);
	await game.selectCard(diffId);
	await expect(async () => {
		await game.card(diffId).click();
		await game.expectScene('EDITOR', 3_000);
	}).toPass({ timeout: 60_000 });
};

/** Note every sound the game lays on the effects player from now on (see effectsPlayed). */
const spyEffects = (page: Page) => page.evaluate(() => {
	const effects = (globalThis as unknown as {
		__ossIdleEffects: { play: (key: string, options?: object) => void },
	}).__ossIdleEffects;
	const keys: string[] = [];
	(window as unknown as { played: string[] }).played = keys;
	const play = effects.play.bind(effects);
	effects.play = (key, options) => {
		keys.push(key);
		play(key, options);
	};
});

/** Run an action from the command list (Ctrl+K) by its label's first words, answering
 *  its prompt when it asks for a value. */
const command = async (page: Page, search: string, answer?: string) => {
	await page.keyboard.press('Control+k');
	await expect(page.locator('.editor__commands-search')).toBeFocused();
	await page.keyboard.type(search);
	await page.keyboard.press('Enter');
	if (answer === undefined) return;
	await page.keyboard.type(answer);
	await page.keyboard.press('Enter');
};

/** The sounds noted since spyEffects, by their effects key. */
const effectsPlayed = (page: Page): Promise<string[]> =>
	page.evaluate(() => (window as unknown as { played: string[] }).played);

test.describe('editor', () => {

	// the playfield draws in a worker: an error there blanks it while the page looks fine
	let playfieldErrors: string[] = [];
	test.beforeEach(({ page }) => {
		playfieldErrors = [];
		page.on('console', message => {
			if (message.type() === 'error' && message.text().startsWith('[playfield]')) {
				playfieldErrors.push(message.text());
			}
		});
	});
	test.afterEach(() => expect(playfieldErrors).toEqual([]));

	test('notes are placed, undone, saved to a local copy, and removed', async ({ game, page }) => {
		await game.openMenu();
		const { set, version } = await game.installEasiest();
		await openEditor(game, set.title, version.id);

		const notes = page.locator('.editor__counts');
		await expect(notes).toBeVisible();
		const count = async () => Number(await notes.getAttribute('data-notes'));
		const before = await count();

		// the song starts at 0, before the first note
		await page.keyboard.press('1');
		await expect.poll(count).toBe(before + 1);
		await page.keyboard.press('Control+z');
		await expect.poll(count).toBe(before);
		await page.keyboard.press('Control+y');
		await expect.poll(count).toBe(before + 1);

		await page.keyboard.press('Control+s');
		await expect(page.locator('.message__contents:not(.closing)', { hasText: 'Saved' })).toBeVisible();
		expect((await game.installedSets()).some(id => id < 0)).toBe(true);

		// a click on the second column, above the time line, places; a right click removes
		const box = (await page.locator('.editor__playfield').boundingBox())!;
		const spot = {
			x: columnX(box, 1), y: box.y + box.height * 0.5,
		};
		await page.mouse.click(spot.x, spot.y);
		await expect.poll(count).toBe(before + 2);
		await page.mouse.click(spot.x, spot.y, { button: 'right' });
		await expect.poll(count).toBe(before + 1);

		await page.mouse.click(spot.x, spot.y);
		await page.keyboard.press('Escape');
		await page.getByText('Discard', { exact: true }).click();
		await game.expectScene('SELECT');

		// back on the local copy, which reopens as saved
		const copy = page.locator('.bm-card.is-active[data-id^="-"]');
		await expect(copy).toBeVisible();
		await copy.click();
		await game.expectScene('EDITOR');
		await expect.poll(count).toBe(before + 1);
	});

	test('space plays the song from the current time', async ({ game, page }) => {
		await game.openMenu();
		const { set, version } = await game.installEasiest();
		await openEditor(game, set.title, version.id);

		const time = page.locator('.editor__time .ladder-sum__value');
		await expect(time).toHaveText(/^0:00\.000/);
		await page.keyboard.press(' ');
		await expect(time).not.toHaveText(/^0:00\.000/);
		await page.keyboard.press(' ');
		// the clock redraws every 50ms
		await page.waitForTimeout(150);
		const paused = await time.innerText();
		await page.waitForTimeout(300);
		await expect(time).toHaveText(paused);
	});

	test('the tools: select picks, note places and removes, note + LN drags long notes', async ({
		game, page,
	}) => {
		await game.newMap('Tools.wav');
		const count = async () => Number(await page.locator('.editor__counts').getAttribute('data-notes'));
		const longs = async () =>
			Number(/(\d+) LN/.exec(await page.locator('.editor__counts').innerText())?.[1]);
		await expect.poll(count).toBe(0);
		const tool = (name: string) => page.locator('.editor__modes').getByRole('button', {
			name, exact: true, 
		});
		const box = (await page.locator('.editor__playfield').boundingBox())!;
		const y = box.y + box.height * 0.5;
		const drag = async (column: number) => {
			await page.mouse.move(columnX(box, column), y);
			await page.mouse.down();
			await page.mouse.move(columnX(box, column), y - 150, { steps: 5 });
			await page.mouse.up();
		};

		// Note + LN, the default: a drag up is a long note
		await expect(tool('Note + LN')).toHaveClass(/is-active/);
		await drag(0);
		await expect.poll(longs).toBe(1);

		// Tab: Select places nothing
		await page.keyboard.press('Tab');
		await expect(tool('Select')).toHaveClass(/is-active/);
		await page.mouse.click(columnX(box, 2), y);
		await expect.poll(count).toBe(1);

		// Tab: Note - a drag is a plain note, and a click on it removes it
		await page.keyboard.press('Tab');
		await expect(tool('Note')).toHaveClass(/is-active/);
		await drag(2);
		await expect.poll(count).toBe(2);
		expect(await longs()).toBe(1);
		await page.mouse.click(columnX(box, 2), y);
		await expect.poll(count).toBe(1);

		// a click on a tool picks it, and Tab goes round
		await tool('Select').click();
		await expect(tool('Select')).toHaveClass(/is-active/);
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');
		await expect(tool('Note + LN')).toHaveClass(/is-active/);
	});

	test('a selection dragged sideways stays inside the columns', async ({ game, page }) => {
		await game.newMap('Move.wav');
		const count = async () => Number(await page.locator('.editor__counts').getAttribute('data-notes'));
		const tool = (name: string) => page.locator('.editor__modes').getByRole('button', {
			name, exact: true,
		});
		const box = (await page.locator('.editor__playfield').boundingBox())!;
		const y = box.y + box.height * 0.5;
		await tool('Note').click();
		await page.mouse.click(columnX(box, 0), y);
		await page.mouse.click(columnX(box, 2), y - 100);
		await expect.poll(count).toBe(2);

		// grabbed by the first column's note and dragged three over: the third column's
		// can only go one, so both go one
		await tool('Select').click();
		await page.keyboard.press('Control+a');
		await page.mouse.move(columnX(box, 0), y);
		await page.mouse.down();
		await page.mouse.move(columnX(box, 3), y, { steps: 6 });
		await page.mouse.up();

		// the note tool's click removes a note where there is one
		await tool('Note').click();
		await page.mouse.click(columnX(box, 3), y - 100);
		await expect.poll(count).toBe(1);
		await page.mouse.click(columnX(box, 1), y);
		await expect.poll(count).toBe(0);

	});

	test('the side panels are resized by their inner edge, and keep their width', async ({
		game, page,
	}) => {
		await game.newMap('Panels.wav');
		const left = page.locator('.editor__side--left');
		const right = page.locator('.editor__side--right');
		const widthOf = async (panel: typeof left) => (await panel.boundingBox())!.width;
		const before = await widthOf(left);
		const edge = (await left.locator('.editor__panel-resize').boundingBox())!;
		await page.mouse.move(edge.x + edge.width / 2, edge.y + 300);
		await page.mouse.down();
		await page.mouse.move(edge.x + edge.width / 2 + 80, edge.y + 300, { steps: 5 });
		await page.mouse.up();
		await expect.poll(() => widthOf(left)).toBe(before + 80);

		const rightBefore = await widthOf(right);
		const rightEdge = (await right.locator('.editor__panel-resize').boundingBox())!;
		await page.mouse.move(rightEdge.x + 4, rightEdge.y + 300);
		await page.mouse.down();
		await page.mouse.move(rightEdge.x + 4 - 50, rightEdge.y + 300, { steps: 5 });
		await page.mouse.up();
		await expect.poll(() => widthOf(right)).toBe(rightBefore + 50);

		// back in the editor later, the same widths
		await page.keyboard.press('Escape');
		await game.expectScene('SELECT');
		await page.keyboard.press('Escape');
		await game.newMap('Panels again.wav');
		await expect.poll(() => widthOf(left)).toBe(before + 80);
		await expect.poll(() => widthOf(right)).toBe(rightBefore + 50);
	});

	test('a long note is resized by dragging its end with the select tool', async ({ game, page }) => {
		await game.newMap('Resize.wav');
		const count = async () => Number(await page.locator('.editor__counts').getAttribute('data-notes'));
		const tool = (name: string) => page.locator('.editor__modes').getByRole('button', {
			name, exact: true, 
		});
		const box = (await page.locator('.editor__playfield').boundingBox())!;
		const x = columnX(box, 0);
		const y = box.y + box.height * 0.6;
		const drag = async (from: number, to: number) => {
			await page.mouse.move(x, from);
			await page.mouse.down();
			await page.mouse.move(x, to, { steps: 6 });
			await page.mouse.up();
		};

		// a long note, then its end dragged further up
		await drag(y, y - 120);
		await expect.poll(count).toBe(1);
		await tool('Select').click();
		await drag(y - 120, y - 260);
		await expect(page.locator('.editor__selected')).toHaveText('1 selected');

		// a spot past its old end is inside it now: the note tool's click removes it
		await tool('Note').click();
		await page.mouse.click(x, y - 200);
		await expect.poll(count).toBe(0);
	});

	test('the song plays at the playback speed, its pitch kept', async ({ game, page }) => {
		await game.newMap('Speed.wav', clicks(120, 0, 20));
		const time = page.locator('.editor__time .ladder-sum__value');
		const seconds = async () => {
			const [, m, s] = /(\d+):(\d+\.\d+)\//.exec(await time.innerText())!;
			return Number(m) * 60 + Number(s);
		};
		// listen to the live stretcher: the kept pitch is made as the song plays
		await page.evaluate(() => {
			const Live = AudioWorkletNode;
			const heard = window as unknown as { loudest: number };
			heard.loudest = 0;
			window.AudioWorkletNode = class extends Live {
				constructor(...args: ConstructorParameters<typeof AudioWorkletNode>) {
					super(...args);
					const analyser = this.context.createAnalyser();
					this.connect(analyser);
					const data = new Float32Array(analyser.fftSize);
					const listen = () => {
						analyser.getFloatTimeDomainData(data);
						for (const sample of data) heard.loudest = Math.max(heard.loudest, Math.abs(sample));
						requestAnimationFrame(listen);
					};
					listen();
				}
			};
		});
		// the song is decoded once: a speed change plays the same track
		await page.evaluate(() => {
			const decode = AudioContext.prototype.decodeAudioData;
			const w = window as unknown as { decodes: number };
			w.decodes = 0;
			AudioContext.prototype.decodeAudioData = function (this: AudioContext, ...args) {
				w.decodes++;
				return decode.apply(this, args);
			} as typeof decode;
		});
		const decodes = () => page.evaluate(() => (window as unknown as { decodes: number }).decodes);
		// song select's rate keys, a step of 5% each
		for (let i = 0; i < 10; i++) await page.keyboard.press('Control+Minus');
		await expect(page.locator('.editor__speed')).toHaveText('50%');
		await expect(page.locator('.editor__speed')).not.toHaveClass(/is-pending/);
		const pitch = page.locator('.editor__stat', { hasText: 'Keep the pitch' });
		await pitch.getByRole('button', { name: 'Off' }).click();
		await pitch.getByRole('button', { name: 'On' }).click();
		await expect(page.locator('.editor__speed')).not.toHaveClass(/is-pending/);
		expect(await decodes()).toBe(0);

		// timed by the clock, not the wait: a loaded machine delivers keys late
		const started = Date.now();
		await page.keyboard.press('Space');
		await page.waitForTimeout(2000);
		await page.keyboard.press('Space');
		const elapsed = (Date.now() - started) / 1000;
		expect(await page.evaluate(() => (window as unknown as { loudest: number }).loudest))
			.toBeGreaterThan(0.1);
		// half as much song as time went by
		const played = await seconds();
		expect(played).toBeGreaterThan(elapsed * 0.5 * 0.6);
		expect(played).toBeLessThan(elapsed * 0.5 * 1.15);
	});

	test('the metronome ticks every beat, the first of a bar higher', async ({ game, page }) => {
		await game.newMap('Metronome.wav');
		// count what the editor lays on the audio clock
		await spyEffects(page);
		const ticks = async () =>
			(await effectsPlayed(page)).filter(key => key.startsWith('editor:metronome'));

		const metronome = page.locator('.editor__stat', { hasText: 'Metronome' });
		await metronome.getByRole('button', {
			name: 'Beats', exact: true,
		}).click();
		await page.keyboard.press('Space');
		await page.waitForTimeout(2000);
		await page.keyboard.press('Space');
		// 120 BPM, 4 to the bar: a tick every half second, the high one every fourth (the
		// first ones are laid ahead by the output's delay, which a loaded machine stretches)
		const played = await ticks();
		expect(played.length).toBeGreaterThanOrEqual(3);
		const bar = played.indexOf('editor:metronome-measure');
		played.forEach((key, i) => {
			const onBar = bar >= 0 && ((i - bar) % 4 + 4) % 4 === 0;
			expect(key).toBe(onBar ? 'editor:metronome-measure' : 'editor:metronome-beat');
		});
	});

	test('hitsounds are set on the selection and heard as the song plays', async ({ game, page }) => {
		await game.newMap('Hitsounds.wav');
		await spyEffects(page);
		const box = (await page.locator('.editor__playfield').boundingBox())!;
		const x = columnX(box, 1);
		const y = box.y + box.height * 0.45;
		await page.mouse.click(x, y);
		await expect(page.locator('.editor__counts')).toHaveAttribute('data-notes', '1');
		await page.locator('.editor__modes').getByRole('button', {
			name: 'Select', exact: true, 
		}).click();
		await page.mouse.click(x, y);
		await page.locator('.editor__tabs button', { hasText: 'Hitsounds' }).click();

		await page.keyboard.press('W');
		const stat = (label: string) => page.locator('.editor__stat', { hasText: label });
		await expect(stat('Additions').getByRole('button', { name: 'Whistle' })).toHaveClass(/is-active/);
		const soft = stat('Sample set').first().getByRole('button', { name: 'Soft' });
		await soft.click();
		await expect(soft).toHaveClass(/is-active/);

		await page.keyboard.press('Space');
		await expect.poll(() => effectsPlayed(page))
			.toEqual(expect.arrayContaining(['synth:soft-hitnormal', 'synth:soft-hitwhistle']));
		await page.keyboard.press('Space');

		// the custom index offers what the map has files for: a numbered whistle, added
		const index = stat('Custom index').first().locator('select');
		await expect(index.locator('option')).toHaveText(['From the line']);
		const chooser = page.waitForEvent('filechooser');
		await stat('Sample file').getByRole('button', { name: 'Add...' }).click();
		await (await chooser).setFiles({
			name: 'soft-hitwhistle2.wav', mimeType: 'audio/wav', buffer: clicks(120, 0, 1),
		});
		await expect(index.locator('option')).toHaveText(['From the line', '2 · soft-hitwhistle2.wav']);
		await index.selectOption('2');
		await expect(index).toHaveValue('2');
		const seek = (await page.locator('.editor__seek').boundingBox())!;
		await page.mouse.click(seek.x + 1, seek.y + seek.height / 2);
		await page.keyboard.press('Space');
		await expect.poll(() => effectsPlayed(page))
			.toEqual(expect.arrayContaining([expect.stringContaining('soft-hitwhistle2')]));
		await page.keyboard.press('Space');

		// the map's sound files: what each is, how many notes play it; deleted after asking
		const file = page.locator('.editor__sound-file', { hasText: 'soft-hitwhistle2.wav' });
		await expect(file).toContainText('Soft whistle · 2');
		await expect(file).toContainText('1 note');
		await file.getByRole('button', { name: 'Delete soft-hitwhistle2.wav' }).click();
		await page.getByRole('button', {
			name: 'Delete', exact: true, 
		}).click();
		await expect(page.locator('.editor__sound-file')).toHaveCount(0);
		await expect(index.locator('option')).toHaveText(['From the line', '2 · no files']);
	});

	test('the wheel moves along the beat lines, and zooms with ctrl', async ({ game, page }) => {
		await game.openMenu();
		const { set, version } = await game.installEasiest();
		await openEditor(game, set.title, version.id);

		const time = page.locator('.editor__time .ladder-sum__value');
		const ms = async () => {
			const [, m, s] = /^(\d+):(\d+\.\d+)/.exec(await time.innerText())!;
			return Math.round((Number(m) * 60 + Number(s)) * 1000);
		};
		const moved = async (from: number) => {
			await expect.poll(ms).not.toBe(from);
			return ms();
		};
		await page.locator('.editor__playfield').hover();
		// down goes forward, onto a beat line
		await page.mouse.wheel(0, 100);
		const line = await moved(0);
		expect(line).toBeGreaterThan(0);
		await page.mouse.wheel(0, 100);
		const step = await moved(line) - line;
		expect(step).toBeGreaterThan(0);
		await page.mouse.wheel(0, -100);
		expect(await moved(line + step)).toBe(line);

		await page.keyboard.down('Shift');
		await page.mouse.wheel(0, 100);
		await page.keyboard.up('Shift');
		const shifted = await moved(line);
		expect(shifted - line).toBeGreaterThanOrEqual(step * 4 - 2);

		// alt + wheel is the volume
		await page.keyboard.down('Alt');
		await page.mouse.wheel(0, 100);
		await page.keyboard.up('Alt');
		await page.waitForTimeout(150);
		expect(await ms()).toBe(shifted);

		await page.keyboard.down('Control');
		await page.mouse.wheel(0, -100);
		await page.keyboard.up('Control');
		const zoom = await page.evaluate(() => localStorage.getItem('editor.zoom'));
		expect(Number(zoom)).toBeGreaterThan(0.3);
	});

	test('notes are selected, cut, undone and pasted', async ({ game, page }) => {
		await game.openMenu();
		const { set, version } = await game.installEasiest();
		await openEditor(game, set.title, version.id);

		const count = async () => Number(await page.locator('.editor__counts').getAttribute('data-notes'));
		// shown beside the counts only when something is selected
		const selected = async () => {
			const shown = page.locator('.editor__selected');
			return await shown.count() ? Number(/\d+/.exec(await shown.innerText())![0]) : 0;
		};
		const total = await count();

		await page.keyboard.press('Control+a');
		await expect.poll(selected).toBe(total);
		await page.keyboard.press('Escape');
		await expect.poll(selected).toBe(0);
		await game.expectScene('EDITOR');

		// into the song, then a box over the upper half of the field
		const seek = (await page.locator('.editor__seek').boundingBox())!;
		await page.mouse.click(seek.x + seek.width * 0.3, seek.y + seek.height / 2);
		const box = (await page.locator('.editor__playfield').boundingBox())!;
		const left = box.x + box.width / 2 - 140;
		await page.locator('.editor__modes').getByRole('button', {
			name: 'Select', exact: true, 
		}).click();
		await page.mouse.move(left, box.y + 10);
		await page.mouse.down();
		await page.mouse.move(left + 280, box.y + box.height * 0.7, { steps: 5 });
		await page.mouse.up();
		const boxed = await selected();
		expect(boxed).toBeGreaterThan(0);

		await page.keyboard.press('Control+x');
		await expect.poll(count).toBe(total - boxed);
		await page.keyboard.press('Control+z');
		await expect.poll(count).toBe(total);

		// pasted past the last note, where nothing is in the way
		await page.mouse.click(seek.x + seek.width - 1, seek.y + seek.height / 2);
		await page.keyboard.press('Control+v');
		await expect.poll(count).toBe(total + boxed);
		await expect.poll(selected).toBe(boxed);
	});

	test('a test play runs the unsaved chart and comes back to the editor', async ({ game, page }) => {
		await game.openMenu();
		const { set, version } = await game.installEasiest();
		await openEditor(game, set.title, version.id);

		const count = async () => Number(await page.locator('.editor__counts').getAttribute('data-notes'));
		const before = await count();
		await page.keyboard.press('1');
		await expect.poll(count).toBe(before + 1);

		// Esc leaves a test play at once, back to the same unsaved edit
		await page.keyboard.press('t');
		await game.expectScene('GAME');
		await expect(page.locator('.play canvas').first()).toBeVisible();
		await page.keyboard.press('Escape');
		await game.expectScene('EDITOR');
		await expect.poll(count).toBe(before + 1);
		await expect(page.locator('.editor__action', { hasText: 'Save' })).toBeEnabled();

		// and the editor has its song back
		const time = page.locator('.editor__time .ladder-sum__value');
		await page.keyboard.press(' ');
		await expect(time).not.toHaveText(/^0:00\.000/);
		await page.keyboard.press(' ');

		// from the end of the song, the play runs out and hands back by itself
		const seek = (await page.locator('.editor__seek').boundingBox())!;
		await page.mouse.click(seek.x + seek.width - 2, seek.y + seek.height / 2);
		await page.keyboard.press('t');
		await game.expectScene('GAME');
		await game.expectScene('EDITOR', 60_000);
		await expect.poll(count).toBe(before + 1);
	});

	test('a section is given a beat snap of its own, kept in the .oss file', async ({ game, page }) => {
		await game.openMenu();
		const { set, version } = await game.installEasiest();
		await openEditor(game, set.title, version.id);

		await page.locator('.editor__tabs button', { hasText: 'Timing' }).click();
		const first = page.locator('.editor__point:not(.editor__point--head)').first();
		const snap = first.getByLabel('Beat snap');
		await expect(snap).toHaveValue('');
		await snap.fill('3');
		await snap.press('Enter');
		await expect(first.getByLabel('Beat snap')).toHaveValue('3');

		// the beat snap goes to the section's as the time is in it
		await page.locator('.editor__tabs button', { hasText: 'Compose' }).click();
		const snaps = page.locator('.editor__stat', { hasText: 'Beat snap' }).first();
		await expect(snaps.getByRole('button', {
			name: '1/3', exact: true, 
		})).toHaveClass(/is-active/);

		await page.keyboard.press('Control+s');
		await expect(page.locator('.message__contents:not(.closing)', { hasText: 'Saved' })).toBeVisible();

		// the exported set carries it beside the .osu
		const download = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Export .osz' }).click();
		const files = unzipSync(new Uint8Array(readFileSync(await (await download).path())));
		const oss = Object.keys(files).filter(name => name.endsWith('.oss'));
		expect(oss).toHaveLength(1);
		const extras = JSON.parse(strFromU8(files[oss[0]])) as { snaps: { divisor: number }[] };
		expect(extras.snaps.map(s => s.divisor)).toEqual([3]);

		// and the editor reads it back
		await page.keyboard.press('Escape');
		await game.expectScene('SELECT');
		const copy = page.locator('.bm-card.is-active[data-id^="-"]');
		await expect(async () => {
			await copy.click();
			await game.expectScene('EDITOR', 3_000);
		}).toPass({ timeout: 30_000 });
		await page.locator('.editor__tabs button', { hasText: 'Timing' }).click();
		const reopened = page.locator('.editor__point:not(.editor__point--head)').first();
		await expect(reopened.getByLabel('Beat snap')).toHaveValue('3');
	});

	test('timing points are added and changed, undoably', async ({ game, page }) => {
		await game.openMenu();
		const { set, version } = await game.installEasiest();
		await openEditor(game, set.title, version.id);

		await page.locator('.editor__tabs button', { hasText: 'Timing' }).click();
		const points = page.locator('.editor__point:not(.editor__point--head)');
		const before = await points.count();
		expect(before).toBeGreaterThan(0);

		const seek = (await page.locator('.editor__seek').boundingBox())!;
		await page.mouse.click(seek.x + seek.width * 0.5, seek.y + seek.height / 2);
		await page.getByRole('button', { name: 'Add at the current time' }).click();
		await expect(points).toHaveCount(before + 1);

		const bpm = points.last().getByLabel('BPM');
		await bpm.fill('200');
		await bpm.press('Enter');
		await expect(points.last().getByLabel('BPM')).toHaveValue('200');

		await page.keyboard.press('Control+z');
		await expect(points.last().getByLabel('BPM')).not.toHaveValue('200');
		await page.keyboard.press('Control+z');
		await expect(points).toHaveCount(before);
	});

	test('metadata is edited and saved to every difficulty of the set', async ({ game, page }) => {
		await game.openMenu();
		const { set, version } = await game.installEasiest();
		await openEditor(game, set.title, version.id);

		await page.locator('.editor__tabs button', { hasText: 'Metadata' }).click();
		const title = page.getByLabel('Title', { exact: true });
		await title.fill('Renamed Song');
		await title.press('Enter');
		await expect(page.locator('.editor__title')).toHaveText('Renamed Song');

		await page.keyboard.press('Control+s');
		await expect(page.locator('.message__contents:not(.closing)', { hasText: 'Saved' })).toBeVisible();
		await page.keyboard.press('Escape');
		await game.expectScene('SELECT');

		// the local copy's difficulties all carry the new title
		await game.search('Renamed Song');
		const cards = page.locator('.bm-card[data-id^="-"]');
		await expect(cards.first()).toBeVisible();
		expect(await cards.count()).toBe(set.versions.filter(v => v.mode === 3 && v.keys === 4).length);

		// renaming the local copy again keeps it the same set
		const localSets = async () => (await game.installedSets()).filter(id => id < 0);
		await expect.poll(localSets).toHaveLength(1);
		const [local] = await localSets();
		const copy = page.locator('.bm-card.is-active[data-id^="-"]');
		await expect(async () => {
			await copy.click();
			await game.expectScene('EDITOR', 3_000);
		}).toPass({ timeout: 30_000 });
		await page.locator('.editor__tabs button', { hasText: 'Metadata' }).click();
		await title.fill('Renamed Twice');
		await title.press('Enter');
		await page.keyboard.press('Control+s');
		await expect(page.locator('.message__contents:not(.closing)', { hasText: 'Saved' })).toBeVisible();
		await expect.poll(localSets).toEqual([local]);
	});

	test('a new map starts on an audio file and grows difficulties', async ({ game, page }) => {
		await game.newMap('My Song.wav');
		await expect(page.locator('.editor__title')).toHaveText('My Song');
		const count = async () => Number(await page.locator('.editor__counts').getAttribute('data-notes'));
		await expect.poll(count).toBe(0);
		expect((await game.installedSets()).filter(id => id < 0)).toHaveLength(1);

		await page.keyboard.press('1');
		await page.keyboard.press('ArrowUp');
		await page.keyboard.press('2');
		await expect.poll(count).toBe(2);

		// the difficulty dropdown: the set's difficulties, then adding one
		const version = page.locator('.editor__difficulty .dropdown__current');
		const pick = async (name: string | RegExp) => {
			await version.click();
			await page.getByRole('option', {
				name, exact: typeof name === 'string',
			}).click();
		};

		// a copy saves this one first, then opens with its notes, on the same track
		const time = page.locator('.editor__time .ladder-sum__value');
		await expect(time).toContainText('0:00.125/');
		const at = await time.innerText();
		await pick('Copy difficulty');
		await expect(version).toContainText('New difficulty (copy)');
		await expect.poll(count).toBe(2);
		await expect(time).toHaveText(at);

		await pick('New difficulty');
		await expect(version).toContainText('New difficulty 2');
		await expect.poll(count).toBe(0);
		await version.click();
		// the set's three, each with its stars, besides the New difficulty option
		await expect(page.getByRole('option', { name: /^New difficulty.*★/ })).toHaveCount(3);
		await version.click();

		// switching with an unsaved change asks first
		await page.keyboard.press('1');
		await pick(/^New difficulty \(copy\)/);
		await page.getByText('Discard', { exact: true }).click();
		await expect(version).toContainText('New difficulty (copy)');
		await expect.poll(count).toBe(2);
		expect((await game.installedSets()).filter(id => id < 0)).toHaveLength(1);
	});

	test('the live preview is on by default and can be turned off', async ({ game, page }) => {
		await game.openMenu();
		const { set, version } = await game.installEasiest();
		await openEditor(game, set.title, version.id);

		const toggle = page.locator('.editor__stat', { hasText: 'Live preview' })
			.locator('.editor__toggle');
		await expect(toggle.getByRole('button', { name: 'On' })).toHaveClass(/is-active/);
		await toggle.getByRole('button', { name: 'Off' }).click();
		await expect(toggle.getByRole('button', { name: 'Off' })).toHaveClass(/is-active/);

		// without it the field is back in the middle
		const count = async () => Number(await page.locator('.editor__counts').getAttribute('data-notes'));
		const before = await count();
		const box = (await page.locator('.editor__playfield').boundingBox())!;
		await page.mouse.click(columnX(box, 1, false), box.y + box.height * 0.5);
		await expect.poll(count).toBe(before + 1);

		// and it stays off next time
		await page.keyboard.press('Control+z');
		await page.keyboard.press('Escape');
		await game.expectScene('SELECT');
		await expect(async () => {
			await game.card(version.id).click();
			await game.expectScene('EDITOR', 3_000);
		}).toPass({ timeout: 30_000 });
		const previewOff = page.locator('.editor__stat', { hasText: 'Live preview' })
			.getByRole('button', { name: 'Off' });
		await expect(previewOff)
			.toHaveClass(/is-active/);
	});

	test('SV points are added, changed and removed', async ({ game, page }) => {
		await game.newMap('Speed.wav');

		await page.locator('.editor__tabs button', { hasText: 'SV' }).click();
		const points = page.locator('.editor__point--scroll:not(.editor__point--head)');
		await expect(points).toHaveCount(0);
		for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowUp');
		await page.getByRole('button', { name: 'Add at the current time' }).click();
		await expect(points).toHaveCount(1);
		await expect(points.first().getByLabel('Speed')).toHaveValue('1');

		const speed = points.first().getByLabel('Speed');
		await speed.fill('2');
		await speed.press('Enter');
		await expect(points.first().getByLabel('Speed')).toHaveValue('2');
		await page.keyboard.press('Control+z');
		await expect(points.first().getByLabel('Speed')).toHaveValue('1');

		await points.first().getByRole('button', { name: 'Remove' }).click();
		await expect(points).toHaveCount(0);
	});

	test('SV is ramped, set and scaled over the selected notes', async ({ game, page }) => {
		await game.newMap('Ramp.wav');

		// notes at 0 and one beat later (120 BPM, 1/4 snap)
		await page.keyboard.press('1');
		for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowUp');
		await page.keyboard.press('2');
		await page.keyboard.press('Control+a');
		const seek = (await page.locator('.editor__seek').boundingBox())!;
		await page.mouse.click(seek.x + 1, seek.y + seek.height / 2);

		await page.locator('.editor__tabs button', { hasText: 'SV' }).click();
		await expect(page.locator('.editor__tools')).toContainText('0:00.000 to 0:00.500');
		const points = page.locator('.editor__point--scroll:not(.editor__point--head)');
		const speeds = () => points.getByLabel('Speed').evaluateAll(
			inputs => inputs.map(input => (input as HTMLInputElement).value),
		);
		const tool = (name: string) => page.locator('.editor__tool', { hasText: name });

		await tool('Linear').getByRole('button', { name: 'Apply' }).click();
		await expect.poll(speeds).toEqual(['1', '1.25', '1.5', '1.75', '2']);

		await tool('Set to').getByLabel('Speed for the stretch').fill('0.5');
		await tool('Set to').getByRole('button', { name: 'Apply' }).click();
		await expect.poll(speeds).toEqual(['0.5', '2']);

		await tool('Scale by').getByLabel('Scale factor').fill('2');
		await tool('Scale by').getByRole('button', { name: 'Apply' }).click();
		await expect.poll(speeds).toEqual(['1', '2']);

		for (let i = 0; i < 3; i++) await page.keyboard.press('Control+z');
		await expect(points).toHaveCount(0);
	});

	test('the background image is changed from the metadata tab', async ({ game, page }) => {
		await game.newMap('Background.wav');
		const issues = page.locator('.editor__checks li');
		await page.locator('.editor__checks-toggle').click();
		await expect(issues.filter({ hasText: 'No background image' })).toHaveCount(1);

		await page.locator('.editor__tabs button', { hasText: 'Metadata' }).click();
		const row = page.locator('.editor__labelled', { hasText: 'Background' });
		await expect(row.locator('.editor__file')).toHaveText('None');
		const chooser = page.waitForEvent('filechooser');
		await row.getByRole('button', { name: 'Change...' }).click();
		// a 1x1 PNG
		await (await chooser).setFiles({
			name: 'cover.png',
			mimeType: 'image/png',
			buffer: Buffer.from(
				'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
				'base64',
			),
		});
		await expect(row.locator('.editor__file')).toHaveText('cover.png');
		await expect(issues.filter({ hasText: 'No background image' })).toHaveCount(0);
	});

	test('whole-map modifiers, the offset, the seeks and the snaps', async ({ game, page }) => {
		await game.newMap('Modifiers.wav');
		const counts = page.locator('.editor__counts');
		const time = page.locator('.editor__time .ladder-sum__value');
		const up = async (lines: number) => {
			for (let i = 0; i < lines; i++) await page.keyboard.press('ArrowUp');
		};
		// 120 BPM, 1/4 lines 125 ms apart: column 1 at 0, 500 and 1000 ms, column 2 at 250
		await page.keyboard.press('1');
		await up(2);
		await page.keyboard.press('2');
		await up(2);
		await page.keyboard.press('1');
		await up(4);
		await page.keyboard.press('1');
		await expect(counts).toContainText('4 rice, 0 LN');

		// full LN: the first two of column 1 held to the next, its last gone, column 2 alone
		await command(page, 'full LN');
		await expect(counts).toContainText('1 rice, 2 LN');
		await command(page, 'make every LN');
		await expect(counts).toContainText('3 rice, 0 LN');
		await page.keyboard.press('Control+z');
		await page.keyboard.press('Control+z');
		await expect(counts).toContainText('4 rice, 0 LN');

		await command(page, 'offset the whole map', '100');
		await page.keyboard.press('Home');
		await expect(time).toContainText('0:00.100/');
		await page.keyboard.press('End');
		await expect(time).toContainText('0:01.100/');
		await page.keyboard.press('Shift+c');
		await expect(page.locator('.editor__selected')).toHaveText('1 selected');
		await page.keyboard.press('Control+a');
		await page.keyboard.press('u');
		await expect(time).toContainText('0:00.100/');
		await page.keyboard.press('o');
		await expect(time).toContainText('0:01.100/');
		await page.keyboard.press('.');
		await expect(time).toContainText('0:01.101/');
		await page.keyboard.press(',');
		await expect(time).toContainText('0:01.100/');

		const snap = (divisor: string) => page.locator('.editor__stat', { hasText: 'Beat snap' })
			.getByRole('button', {
				name: divisor, exact: true,
			});
		await page.keyboard.press('Shift+5');
		await expect(snap('1/5')).toHaveClass(/is-active/);
		await page.keyboard.press('ArrowRight');
		await expect(snap('1/6')).toHaveClass(/is-active/);
		await command(page, 'custom beat snap', '7');
		await expect(snap('1/7')).toHaveClass(/is-active/);

		await page.locator('.editor__tabs button', { hasText: 'Timing' }).click();
		// the first bar line shows until it is unticked
		const line = page.locator('.editor__point:not(.editor__point--head)').first()
			.getByLabel('Show the first bar line');
		await expect(line).toBeChecked();
		await line.uncheck();
		await expect(line).not.toBeChecked();
		await page.keyboard.press('Control+z');
		await expect(line).toBeChecked();
	});

	test('the selection is reversed, its columns swapped, and pasted snapped or as copied', async ({
		game, page,
	}) => {
		await game.newMap('Selection.wav');
		const count = async () => Number(await page.locator('.editor__counts').getAttribute('data-notes'));
		const selected = page.locator('.editor__selected');
		// column 1 at 0, column 2 at 250 ms
		await page.keyboard.press('1');
		await page.keyboard.press('ArrowUp');
		await page.keyboard.press('ArrowUp');
		await page.keyboard.press('2');
		await expect.poll(count).toBe(2);
		/** Whether column `n` has a note at the current time: its key removes it, and back. */
		const noteAt = async (n: number) => {
			await page.keyboard.press(String(n));
			const removed = await count() === 1;
			await page.keyboard.press('Control+z');
			return removed;
		};

		// reversed: column 2 first
		await page.keyboard.press('Control+a');
		await command(page, 'reverse');
		await page.keyboard.press('Home');
		expect(await noteAt(2)).toBe(true);
		// and the columns swapped back: Alt + one column, Alt + the other
		await page.keyboard.press('Control+a');
		await page.keyboard.press('Alt+1');
		await page.keyboard.press('Alt+2');
		expect(await noteAt(1)).toBe(true);

		// copied, then pasted at 1010 ms as copied, and snapped (onto 1000 ms)
		await page.keyboard.press('Control+a');
		await page.keyboard.press('Control+c');
		await page.keyboard.press('Escape');
		for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowUp');
		for (let i = 0; i < 10; i++) await page.keyboard.press('.');
		await page.keyboard.press('Control+Shift+v');
		await expect.poll(count).toBe(4);
		await page.keyboard.press('Escape');
		await page.keyboard.press('Shift+c');
		await expect(selected).toHaveText('1 selected');
		await page.keyboard.press('Control+z');
		await page.keyboard.press('Control+v');
		await expect.poll(count).toBe(4);
		await page.keyboard.press('Escape');
		await page.keyboard.press('Shift+c');
		await expect(selected).toHaveCount(0);
		for (let i = 0; i < 10; i++) await page.keyboard.press(',');
		await page.keyboard.press('Shift+c');
		await expect(selected).toHaveText('1 selected');
	});

	test('bookmarks are added, jumped between and removed', async ({ game, page }) => {
		await game.newMap('Bookmarks.wav');
		const time = page.locator('.editor__time .ladder-sum__value');
		const marks = page.locator('.editor__bookmark');
		await page.keyboard.press('Control+b');
		await expect(marks).toHaveCount(1);
		// 120 BPM: eight 1/4 lines are a second
		for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowUp');
		await page.keyboard.press('Control+b');
		await expect(marks).toHaveCount(2);
		await page.keyboard.press('Control+ArrowLeft');
		await expect(time).toContainText('0:00.000/');
		await page.keyboard.press('Control+ArrowRight');
		await expect(time).toContainText('0:01.000/');
		await page.getByLabel('Bookmark at 0:01.000').click({ button: 'right' });
		await expect(marks).toHaveCount(1);
		await page.keyboard.press('Control+z');
		await expect(marks).toHaveCount(2);

		// the timeline marks the open tab's points: the timing tab's are its lines
		await page.locator('.editor__tabs button', { hasText: 'Timing' }).click();
		await expect(marks).toHaveCount(0);
		await page.locator('.editor__tabs button', { hasText: 'Compose' }).click();
		await expect(marks).toHaveCount(2);
	});

	test('keys are rebound in the shortcuts list, and reset from the command list', async ({
		game, page,
	}) => {
		await game.newMap('Keys.wav');
		await page.getByRole('button', { name: 'Shortcuts' }).click();
		await page.getByPlaceholder('Find an action or a key').fill('metronome');
		const row = page.locator('.editor__key-row', { hasText: 'Metronome' });
		await row.getByRole('button', {
			name: 'M', exact: true,
		}).click();
		await expect(row).toContainText('Press a key');
		await page.keyboard.press('k');
		await expect(row.getByRole('button', {
			name: 'K', exact: true,
		})).toBeVisible();

		const metronome = page.locator('.editor__stat', { hasText: 'Metronome' });
		const beats = metronome.getByRole('button', {
			name: 'Beats', exact: true,
		});
		await page.keyboard.press('k');
		await expect(beats).toHaveClass(/is-active/);
		await row.getByRole('button', { name: 'Reset' }).click();
		await expect(row.getByRole('button', {
			name: 'M', exact: true,
		})).toBeVisible();

		// rebound again, then every shortcut reset from the command list
		await row.getByRole('button', {
			name: 'M', exact: true,
		}).click();
		await page.keyboard.press('k');
		await expect(row.getByRole('button', {
			name: 'K', exact: true,
		})).toBeVisible();
		await command(page, 'reset every shortcut');
		await expect(row.getByRole('button', {
			name: 'M', exact: true,
		})).toBeVisible();
	});

	test('a key held while the song plays places a long note', async ({ game, page }) => {
		await game.newMap('Live.wav');
		await page.keyboard.press('Space');
		await page.keyboard.down('1');
		await page.waitForTimeout(500);
		await page.keyboard.up('1');
		await page.keyboard.press('Space');
		await expect(page.locator('.editor__counts')).toContainText('0 rice, 1 LN');
	});

	test('the view options change the field, another difficulty shows beside it', async ({
		game, page,
	}) => {
		await game.newMap('Reference.wav');
		await page.keyboard.press('1');
		const version = page.locator('.editor__difficulty .dropdown__current');
		await version.click();
		await page.getByRole('option', {
			name: 'New difficulty', exact: true,
		}).click();
		await expect(version).toContainText('New difficulty 2');

		await page.locator('.editor__tabs button', { hasText: 'View' }).click();
		await page.getByLabel('Background brightness').fill('100');
		await expect(page.locator('.editor__dim')).toHaveCSS('opacity', '0');

		const reference = page.locator('.editor__stat', { hasText: 'Reference difficulty' });
		await expect(reference.getByRole('button', { name: 'None' })).toHaveClass(/is-active/);
		await page.keyboard.press('Shift+p');
		await expect(reference.getByRole('button', {
			name: 'New difficulty', exact: true,
		})).toHaveClass(/is-active/);
		await page.keyboard.press('Shift+p');
		await expect(reference.getByRole('button', { name: 'None' })).toHaveClass(/is-active/);
	});

	test('the tempo is detected from the song, and tapped', async ({ game, page }) => {
		await game.newMap('Tempo.wav', clicks(150, 500, 20));
		await page.locator('.editor__tabs button', { hasText: 'Timing' }).click();
		const points = page.locator('.editor__point:not(.editor__point--head)');
		await expect(points).toHaveCount(1);
		await page.getByRole('button', { name: 'Detect BPM' }).click();
		await expect(page.getByText(/Found 150 BPM/)).toBeVisible({ timeout: 30_000 });
		await page.getByRole('button', { name: /^Add at \d+ ms$/ }).click();
		await expect(points).toHaveCount(2);
		await expect(points.last().getByLabel('BPM')).toHaveValue('150');

		const tap = page.getByRole('button', {
			name: 'Tap', exact: true,
		});
		for (let i = 0; i < 8; i++) {
			await tap.click();
			await page.waitForTimeout(150);
		}
		await expect(page.getByText(/Tapped \d+ BPM over 8 taps/)).toBeVisible();
		await expect(page.getByRole('button', { name: 'Use it' })).toBeVisible();
	});

	test('a box starts outside the columns, is a plain rectangle, and the wheel stretches it', async ({
		game, page,
	}) => {
		await game.newMap('Box.wav');
		// column 1 at 0, column 2 three seconds on (24 lines of 1/4 at 120 BPM)
		await page.keyboard.press('1');
		for (let i = 0; i < 24; i++) await page.keyboard.press('ArrowUp');
		await page.keyboard.press('2');
		await page.keyboard.press('Home');
		await page.locator('.editor__modes').getByRole('button', {
			name: 'Select', exact: true,
		}).click();

		const box = (await page.locator('.editor__playfield').boundingBox())!;
		const lineY = box.y + box.height * 0.8;
		// from right of the field, just under the time line, to a little way into column 1
		await page.mouse.move(columnX(box, 3) + columnWidth(box) * 0.75, lineY + 20);
		await page.mouse.down();
		await page.mouse.move(columnX(box, 0) + columnWidth(box) / 4, lineY - 40, { steps: 4 });
		// scrolled 3 s on (shift: four lines a tick): the box keeps its start on the chart
		await page.keyboard.down('Shift');
		for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 100);
		await page.keyboard.up('Shift');
		await page.mouse.up();
		await expect(page.locator('.editor__selected')).toHaveText('2 selected');
	});

	test('a box follows the song under a still mouse while it plays', async ({ game, page }) => {
		await game.newMap('Follow.wav');
		// column 1 at one and two seconds (8 lines of 1/4 at 120 BPM each)
		for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowUp');
		await page.keyboard.press('1');
		for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowUp');
		await page.keyboard.press('1');
		await page.keyboard.press('Home');
		await page.locator('.editor__modes').getByRole('button', {
			name: 'Select', exact: true,
		}).click();

		const box = (await page.locator('.editor__playfield').boundingBox())!;
		const lineY = box.y + box.height * 0.8;
		await page.mouse.move(columnX(box, 3) + columnWidth(box) * 0.75, lineY + 20);
		await page.mouse.down();
		await page.mouse.move(columnX(box, 0) + columnWidth(box) / 4, lineY - 20, { steps: 2 });
		// the song plays under the still mouse: the box's end goes with it
		await page.keyboard.press('Space');
		await page.waitForTimeout(2500);
		await page.mouse.up();
		await page.keyboard.press('Space');
		await expect(page.locator('.editor__selected')).toHaveText('2 selected');
	});

	test('a note dragged under a still mouse goes with the song while it plays', async ({
		game, page,
	}) => {
		await game.newMap('Drag.wav');
		await page.keyboard.press('1');
		await page.locator('.editor__modes').getByRole('button', {
			name: 'Select', exact: true,
		}).click();

		// the note at 0 sits just above the time line
		const box = (await page.locator('.editor__playfield').boundingBox())!;
		const lineY = box.y + box.height * 0.8;
		await page.mouse.move(columnX(box, 0), lineY - 6);
		await page.mouse.down();
		await page.keyboard.press('Space');
		await page.waitForTimeout(1200);
		await page.mouse.up();
		await page.keyboard.press('Space');

		// the first note is about a second in now
		await page.keyboard.press('Home');
		const time = page.locator('.editor__time .ladder-sum__value');
		await expect(time).not.toContainText('0:00.000/');
		const [, seconds] = /0:(\d+\.\d+)\//.exec(await time.innerText())!;
		expect(Number(seconds)).toBeGreaterThan(0.7);
	});

	test('dragging along the track seeks with the mouse', async ({ game, page }) => {
		await game.newMap('Scrub.wav');
		const time = page.locator('.editor__time .ladder-sum__value');
		const seconds = async () => {
			const [, m, s] = /(\d+):(\d+\.\d+)\//.exec(await time.innerText())!;
			return Number(m) * 60 + Number(s);
		};
		const bar = (await page.locator('.editor__seek').boundingBox())!;
		const y = bar.y + bar.height / 2;
		await page.mouse.move(bar.x + bar.width * 0.1, y);
		await page.mouse.down();
		await page.mouse.move(bar.x + bar.width * 0.6, y, { steps: 5 });
		// the 20 s song (and 2 s after its last note): 60% is about 12 s, before the release
		await expect.poll(seconds).toBeGreaterThan(10);
		await page.mouse.up();
	});

	test('map checks list what to fix and lead to the notes', async ({ game, page }) => {
		await game.newMap('Checked.wav');

		const toggle = page.locator('.editor__checks-toggle');
		await expect(toggle).toHaveClass(/is-error/);
		await toggle.click();
		const issues = page.locator('.editor__checks li');
		await expect(issues.filter({ hasText: 'No notes yet' })).toHaveCount(1);
		await expect(issues.filter({ hasText: 'Empty metadata: artist' })).toHaveCount(1);
		await expect(issues.filter({ hasText: 'not an .mp3 or .ogg' })).toHaveCount(1);

		// a note a 1/4 beat in, then a tempo it no longer sits on
		await page.keyboard.press('ArrowUp');
		await page.keyboard.press('1');
		await expect(issues.filter({ hasText: 'No notes yet' })).toHaveCount(0);
		await page.locator('.editor__tabs button', { hasText: 'Timing' }).click();
		const bpm = page.locator('.editor__point:not(.editor__point--head)').first().getByLabel('BPM');
		await bpm.fill('130');
		await bpm.press('Enter');

		const unsnapped = issues.filter({ hasText: 'off the 1/16 and 1/12 beat lines' });
		await expect(unsnapped).toHaveCount(1);
		await unsnapped.getByRole('button').click();
		await expect(page.locator('.editor__selected')).toHaveText('1 selected');
	});

});
