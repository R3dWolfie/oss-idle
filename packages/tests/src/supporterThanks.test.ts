import {
	describe,
	expect,
	it,
} from 'vitest';
import { supporterThanks } from '../../server/src/supporterThanks';

const base = {
	buyerName: 'peppy',
	giftTo: undefined,
	months: 1,
	serverSeconds: undefined,
	recurring: false,
	tagEndsAt: new Date('2027-01-19T12:00:00Z'),
	storeUrl: 'https://store',
	firstPurchase: true,
	firstTag: true,
	heartsBefore: 0,
	heartsAfter: 1,
};

describe('supporter thank-you', () => {
	it('says what landed on the account', () => {
		const { text } = supporterThanks(base);
		expect(text).toContain('Hi peppy,');
		expect(text).toContain('We added 1 month of supporter tag to your account.');
		expect(text).toContain('will now last until 19 January 2027.');
		expect(text).toContain('now has 1 heart !');
		expect(text).not.toContain('renew');
		expect(text).toContain('\n-- \nAdrien Boitelle');
	});

	it('names the gift recipient and how a subscription renews', () => {
		const { text } = supporterThanks({
			...base, giftTo: 'Cookiezi', months: 3, recurring: true, heartsBefore: 1,
		});
		expect(text).toContain('Cookiezi has received 3 months of supporter thanks to you.');
		expect(text).toContain('first ever');
		expect(text).not.toContain('hearts');
		expect(text).toContain('renew every 3 months');
	});

	it('escapes names in the HTML part and adds the signature', () => {
		const { html } = supporterThanks({
			...base, buyerName: '<b>x</b>', recurring: true,
		});
		expect(html).toContain('Hi &lt;b&gt;x&lt;/b&gt;,');
		expect(html).toContain('<a href="https://store"');
		expect(html).toContain('signature-images');
	});

	it('says how long the server runs on it', () => {
		expect(supporterThanks({
			...base, serverSeconds: 93784, 
		}).text).toContain('running for 1 day, 2 hours, 3 minutes and 4 seconds !');
		expect(supporterThanks({
			...base, serverSeconds: 7200, 
		}).text).toContain('running for 2 hours !');
		expect(supporterThanks(base).text).not.toContain('running for');
	});
});
