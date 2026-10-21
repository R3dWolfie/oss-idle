import {
	describe,
	expect,
	it,
} from 'vitest';
import { isInternal } from '../../server/src/internalAddress';

describe('isInternal', () => {
	it('refuses loopback, private and mapped addresses', () => {
		for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254',
			'0.0.0.0', '::1', '::', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:192.168.1.1']) {
			expect(isInternal(ip), ip).toBe(true);
		}
	});

	it('lets public addresses through', () => {
		for (const ip of ['104.20.41.87', '172.66.172.180', '8.8.8.8', '2606:4700:10::ac42:acb4']) {
			expect(isInternal(ip), ip).toBe(false);
		}
	});
});
