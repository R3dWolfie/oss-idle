import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import num from '@oss-idle/shared/display/num';
import { overdriveText } from '@oss-idle/shared/display/overdrive';

export type Goal = { id: string, goal: number };

export const LINE_NAMES: Record<string, MessageDescriptor> = {
	hits: msg`Notes hit`,
	plays: msg`Play count`,
	time: msg`Hours played`,
	first: msg`#1 ranks`,
	upgrades: msg`Upgrades held`,
	ladders: msg`Skills fully upgraded`,
	overdrive: msg`Highest overdrive`,
	curator: msg`Proposed maps ranked`,
};

export const lineValue = (line: string, value: number): string =>
	line === 'overdrive' ? overdriveText(value)
		: line === 'time' ? `${num(value)}h`
			: num(value);

/** The furthest medal a value reached on its line, and the next one. */
export const lineStanding = (goals: Goal[], value: number) => ({
	reached: goals.filter(g => value >= g.goal).pop(),
	next: goals.find(g => value < g.goal),
});
