import {
	describe,
	expect,
	it,
} from 'vitest';
import {
	SUPPORT_PRESETS,
	supportLevel,
	supporterMonths,
	supporterPrice,
	supporterSaving,
	refundCut,
	unusedRefund,
} from '@oss-idle/shared/supporter';

describe('supporter tag', () => {
	it('prices like osu!store', () => {
		expect([4, 8, 12, 15, 16, 20, 22, 24, 26, 32, 39, 52].map(supporterMonths))
			.toEqual([1, 2, 4, 4, 6, 8, 9, 10, 12, 14, 18, 24]);
	});

	it('puts each preset on the cheapest amount that buys it', () => {
		expect(SUPPORT_PRESETS.map(supporterPrice)).toEqual([4, 8, 12, 16, 26, 39, 52]);
		for (const m of SUPPORT_PRESETS) {
			expect(supporterMonths(supporterPrice(m))).toBe(m);
			expect(supporterMonths(supporterPrice(m) - 1)).toBeLessThan(m);
		}
	});

	it('shows the saving the screenshots show', () => {
		expect([4, 12, 15, 16, 26, 32, 52].map(e => Math.round(supporterSaving(e) * 100)))
			.toEqual([0, 25, 6, 33, 46, 46, 46]);
	});

	it('gives hearts by months ever received, only while active', () => {
		expect([0, 11, 12, 59, 60].map(m => supportLevel(true, m))).toEqual([1, 1, 2, 2, 3]);
		expect(supportLevel(false, 100)).toBe(0);
	});
});

describe('pro-rata refund', () => {
	const day = 86_400_000;
	const order = {
		amount: 1200,
		refunded: 0,
		startsAt: new Date(0),
		endsAt: new Date(120 * day),
		paymentIntent: 'pi_x',
	};

	it('gives back the share of the tag not used yet', () => {
		expect(unusedRefund(order, 30 * day)).toBe(900);
		expect(unusedRefund(order, 120 * day)).toBe(0);
	});

	it('refunds a tag that has not started in full', () => {
		expect(unusedRefund({
			...order, startsAt: new Date(10 * day), endsAt: new Date(40 * day),
		}, 0)).toBe(1200);
	});

	it('counts what was already refunded, and needs a payment', () => {
		expect(unusedRefund({
			...order, refunded: 900, endsAt: new Date(30 * day),
		}, 30 * day)).toBe(0);
		expect(unusedRefund({
			...order, paymentIntent: null,
		}, 0)).toBe(0);
	});

	it('cuts no more of a tag than it has left', () => {
		const tag = {
			startsAt: new Date(0), endsAt: new Date(30 * day),
		};
		expect(refundCut(tag, 1, 0)).toBe(30 * day);
		expect(refundCut(tag, 1, 20 * day)).toBe(10 * day);
		expect(refundCut(tag, 0.5, 10 * day)).toBe(15 * day);
		// long over: a later tag keeps its time
		expect(refundCut(tag, 1, 100 * day)).toBe(0);
	});
});
