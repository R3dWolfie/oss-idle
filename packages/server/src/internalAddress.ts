import {
	BlockList,
	isIP,
} from 'node:net';

const internal = new BlockList();
for (const [net, prefix] of [
	['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
	['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 3],
] as const) internal.addSubnet(net, prefix, 'ipv4');
// IPv4-mapped addresses (::ffff:a.b.c.d) are checked against the IPv4 rules by BlockList itself
for (const [net, prefix] of [
	['::', 127], ['64:ff9b::', 96], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
] as const) internal.addSubnet(net, prefix, 'ipv6');

/** Loopback, private, link-local, CGNAT, multicast or reserved: never fetched for a player. */
export const isInternal = (address: string) =>
	internal.check(address, isIP(address) === 6 ? 'ipv6' : 'ipv4');
