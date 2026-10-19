import { i18n } from '@lingui/core';

/** moment's `LL`, as osu-web shows build dates: "13 October 2026". */
export const formatBuildDate = (date: string) =>
	new Date(`${date}T00:00:00`).toLocaleDateString(i18n.locale, {
		day: 'numeric', month: 'long', year: 'numeric',
	});
