import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import type { Scope } from '@osu-idle/shared/oauth';

/** What a scope lets an application do, as the consent page and the settings list it. */
export const SCOPE_TEXT: Record<Scope, MessageDescriptor> = {
	identify: msg`Identify you and read your public profile.`,
	public: msg`Read public data on your behalf.`,
	'friends.read': msg`See who you are friends with.`,
};
